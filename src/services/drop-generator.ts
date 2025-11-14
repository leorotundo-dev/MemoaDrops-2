import OpenAI from 'openai';
import { recordCostEvent } from '../routes/admin-costs.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface TecnicaMemorizacao {
  tipo: string;  // mnemonic, visual, association, story, etc
  titulo: string;
  descricao: string;
}

export interface DropGerado {
  titulo: string;
  slug: string;
  conteudo: string;
  exemplo_pratico: string;
  tecnicas_memorizacao: TecnicaMemorizacao[];
  dificuldade: 'facil' | 'medio' | 'dificil';
  tempo_estimado_minutos: number;
}

export interface ResultadoGeracao {
  sucesso: boolean;
  drop?: DropGerado;
  erro?: string;
}

/**
 * Gera uma "pílula de conhecimento" (drop) a partir de uma questão
 * Transforma questão bruta em conteúdo didático otimizado
 */
export async function gerarDrop(
  questao: {
    enunciado: string;
    alternativas?: any[];
    gabarito?: string;
    materia_nome?: string;
    topico_nome?: string;
  },
  opcoes?: {
    modelo?: string;
    incluir_gabarito?: boolean;
  }
): Promise<ResultadoGeracao> {
  try {
    console.log(`[Drop Generator] Gerando drop...`);
    
    if (!questao.enunciado || questao.enunciado.length < 20) {
      return {
        sucesso: false,
        erro: 'Enunciado muito curto para gerar drop'
      };
    }
    
    // Preparar contexto da questão
    let contexto = '';
    if (questao.materia_nome) {
      contexto += `Matéria: ${questao.materia_nome}\n`;
    }
    if (questao.topico_nome) {
      contexto += `Tópico: ${questao.topico_nome}\n`;
    }
    
    // Preparar alternativas
    let alternativasTexto = '';
    if (questao.alternativas && questao.alternativas.length > 0) {
      alternativasTexto = '\n\nAlternativas:\n' + questao.alternativas
        .map(alt => `${alt.letra}) ${alt.texto}`)
        .join('\n');
    }
    
    // Preparar gabarito
    let gabaritoTexto = '';
    if (opcoes?.incluir_gabarito && questao.gabarito) {
      gabaritoTexto = `\n\nGabarito: ${questao.gabarito}`;
    }
    
    const prompt = `Você é um especialista em pedagogia e criação de conteúdo didático para concursos públicos.

Transforme a questão abaixo em uma "pílula de conhecimento" (drop) otimizada para aprendizado e memorização.

${contexto}

QUESTÃO:
${questao.enunciado}${alternativasTexto}${gabaritoTexto}

INSTRUÇÕES:
1. Identifique o conceito principal que a questão está testando
2. Crie um título curto e direto (máx 60 caracteres)
3. Reformule o conteúdo em formato didático (200-400 palavras):
   - Explique o conceito de forma clara e objetiva
   - Use linguagem acessível mas precisa
   - Destaque pontos-chave para memorização
   - Inclua a resposta correta de forma natural
4. Crie um exemplo prático de aplicação do conceito (100-200 palavras)
5. Sugira 2-3 técnicas de memorização específicas para este conteúdo:
   - Mnemônicos (frases, acrônimos)
   - Associações visuais
   - Histórias/narrativas
   - Mapas mentais
   - Comparações
   - Etc.
6. Classifique a dificuldade (facil, medio, dificil)
7. Estime o tempo de estudo em minutos (5-15 min)

FORMATO DE SAÍDA (JSON):
{
  "titulo": "Título curto e direto",
  "slug": "titulo-em-kebab-case",
  "conteudo": "Conteúdo didático reformulado...",
  "exemplo_pratico": "Exemplo prático de aplicação...",
  "tecnicas_memorizacao": [
    {
      "tipo": "mnemonic",
      "titulo": "Mnemônico XPTO",
      "descricao": "Use a frase: ..."
    },
    {
      "tipo": "visual",
      "titulo": "Associação Visual",
      "descricao": "Imagine que..."
    }
  ],
  "dificuldade": "medio",
  "tempo_estimado_minutos": 10
}

IMPORTANTE:
- O conteúdo deve ser autocontido (não referenciar "a questão acima")
- Foque no aprendizado do conceito, não na resolução da questão
- As técnicas de memorização devem ser específicas e práticas
- Use markdown para formatação (negrito, listas, etc)`;

    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: opcoes?.modelo || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em pedagogia e criação de conteúdo didático. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7, // Criatividade moderada para conteúdo didático
      response_format: { type: 'json_object' }
    });
    
    const resposta = completion.choices[0].message.content;
    if (!resposta) {
      throw new Error('GPT-4 retornou resposta vazia');
    }
    
    console.log(`[Drop Generator] Resposta recebida do GPT-4`);
    
    // Registrar custo da operação
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    
    try {
      await recordCostEvent({
        provider: 'openai',
        service: 'gpt-4.1-mini:input_token',
        env: 'prod',
        feature: 'gerar_drop',
        unit: 'tokens',
        quantity: inputTokens,
        meta: { modelo: opcoes?.modelo || 'gpt-4.1-mini', materia: questao.materia_nome, duracao_ms: Date.now() - startTime }
      });
      
      await recordCostEvent({
        provider: 'openai',
        service: 'gpt-4.1-mini:output_token',
        env: 'prod',
        feature: 'gerar_drop',
        unit: 'tokens',
        quantity: outputTokens,
        meta: { modelo: opcoes?.modelo || 'gpt-4.1-mini', materia: questao.materia_nome, duracao_ms: Date.now() - startTime }
      });
      
      console.log(`[Drop Generator] Custo registrado: ${inputTokens} input + ${outputTokens} output tokens`);
    } catch (costError) {
      console.error('[Drop Generator] Erro ao registrar custo:', costError);
      // Não falha a operação principal se o tracking falhar
    }
    
    // Parsear resposta JSON
    const drop: DropGerado = JSON.parse(resposta);
    
    // Validar campos obrigatórios
    if (!drop.titulo || !drop.conteudo) {
      throw new Error('Drop gerado está incompleto (falta título ou conteúdo)');
    }
    
    // Garantir slug
    if (!drop.slug) {
      drop.slug = drop.titulo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    
    // Garantir valores padrão
    drop.dificuldade = drop.dificuldade || 'medio';
    drop.tempo_estimado_minutos = drop.tempo_estimado_minutos || 10;
    drop.tecnicas_memorizacao = drop.tecnicas_memorizacao || [];
    
    console.log(`[Drop Generator] Drop gerado com sucesso: "${drop.titulo}"`);
    
    return {
      sucesso: true,
      drop
    };
    
  } catch (error: any) {
    console.error(`[Drop Generator] Erro:`, error.message);
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * Gera drop com estatísticas
 */
export async function gerarDropComEstatisticas(
  questao: {
    enunciado: string;
    alternativas?: any[];
    gabarito?: string;
    materia_nome?: string;
    topico_nome?: string;
  },
  opcoes?: {
    modelo?: string;
    incluir_gabarito?: boolean;
  }
) {
  const inicio = Date.now();
  const resultado = await gerarDrop(questao, opcoes);
  const duracao = Date.now() - inicio;
  
  return {
    ...resultado,
    duracao_ms: duracao,
    duracao_segundos: Math.round(duracao / 1000)
  };
}
