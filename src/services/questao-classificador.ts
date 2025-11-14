import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface MateriaDisponivel {
  id: string;
  nome: string;
  topicos?: TopicoDisponivel[];
}

export interface TopicoDisponivel {
  id: string;
  nome: string;
  nivel: number;
}

export interface ClassificacaoSugerida {
  materia_id: string;
  materia_nome: string;
  topico_id?: string;
  topico_nome?: string;
  relevancia: number;
  justificativa: string;
}

export interface ResultadoClassificacao {
  sucesso: boolean;
  classificacoes: ClassificacaoSugerida[];
  erro?: string;
}

/**
 * Classifica uma questão usando IA (GPT-4)
 * Sugere matéria(s) e tópico(s) baseado no enunciado
 */
export async function classificarQuestao(
  enunciado: string,
  materiasDisponiveis: MateriaDisponivel[],
  opcoes?: {
    modelo?: string;
    maxClassificacoes?: number;
  }
): Promise<ResultadoClassificacao> {
  try {
    console.log(`[Classificador] Classificando questão...`);
    
    if (!enunciado || enunciado.length < 20) {
      return {
        sucesso: false,
        classificacoes: [],
        erro: 'Enunciado muito curto para classificação'
      };
    }
    
    if (!materiasDisponiveis || materiasDisponiveis.length === 0) {
      return {
        sucesso: false,
        classificacoes: [],
        erro: 'Nenhuma matéria disponível para classificação'
      };
    }
    
    // Preparar lista de matérias e tópicos para o prompt
    const materiasTexto = materiasDisponiveis.map(m => {
      let texto = `- ${m.nome} (ID: ${m.id})`;
      if (m.topicos && m.topicos.length > 0) {
        const topicosTexto = m.topicos.map(t => 
          `  - ${t.nome} (ID: ${t.id})`
        ).join('\n');
        texto += `\n${topicosTexto}`;
      }
      return texto;
    }).join('\n');
    
    const prompt = `Você é um especialista em classificação de questões de concursos públicos.

Sua tarefa é analisar a questão e identificar qual(is) matéria(s) da lista ela aborda.

## MATÉRIAS E TÓPICOS DISPONÍVEIS:
${materiasTexto}

## QUESTÃO A CLASSIFICAR:
${enunciado}

## INSTRUÇÕES IMPORTANTES:
1. Analise o CONTEÚDO da questão, não apenas palavras-chave
2. Escolha a matéria mais ESPECÍFICA que se aplica
3. Use EXATAMENTE o ID e nome fornecidos na lista acima
4. Se a questão menciona "SQL", "SELECT", "banco de dados" → use "SQL e Bancos de Dados Relacionais"
5. Se a questão menciona "POO", "classe", "objeto", "encapsulamento" → use "Programação Orientada a Objetos"
6. Se a questão menciona "HTTPS", "protocolo", "rede" → use "Protocolos de Rede e Segurança"
7. Atribua relevância de 0.8 a 1.0 para alta confiança, 0.5 a 0.7 para média
8. Pode classificar em até ${opcoes?.maxClassificacoes || 2} matérias se a questão for multidisciplinar

## EXEMPLOS:

Questão: "Qual comando SQL é usado para recuperar dados?"
Resposta: {"classificacoes": [{"materia_id": "<id-da-materia-sql>", "materia_nome": "SQL e Bancos de Dados Relacionais", "relevancia": 1.0, "justificativa": "Questão sobre comando SQL SELECT"}]}

Questão: "O que é encapsulamento em POO?"
Resposta: {"classificacoes": [{"materia_id": "<id-da-materia-poo>", "materia_nome": "Programação Orientada a Objetos", "relevancia": 1.0, "justificativa": "Questão sobre conceito fundamental de POO"}]}

## FORMATO DE SAÍDA (JSON):
{
  "classificacoes": [
    {
      "materia_id": "<copie-o-uuid-exato-da-lista-acima>",
      "materia_nome": "<copie-o-nome-exato-da-lista-acima>",
      "topico_id": "<opcional-se-houver-topico>",
      "topico_nome": "<opcional-se-houver-topico>",
      "relevancia": 0.9,
      "justificativa": "Breve explicação do porquê"
    }
  ]
}

IMPORTANTE: Retorne APENAS matérias que existem na lista fornecida. Se não tiver certeza, escolha a mais próxima.`;

    const completion = await openai.chat.completions.create({
      model: opcoes?.modelo || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em classificação de questões de concursos. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4, // Temperatura moderada para equilíbrio entre consistência e flexibilidade
      response_format: { type: 'json_object' }
    });
    
    const resposta = completion.choices[0].message.content;
    if (!resposta) {
      throw new Error('GPT-4 retornou resposta vazia');
    }
    
    console.log(`[Classificador] Resposta recebida do GPT-4:`, resposta);
    
    // Parsear resposta JSON
    const dados = JSON.parse(resposta);
    console.log(`[Classificador] Dados parseados:`, JSON.stringify(dados, null, 2));
    const classificacoes: ClassificacaoSugerida[] = dados.classificacoes || [];
    
    // Validar e corrigir classificações (matching por nome se ID não bater)
    console.log(`[Classificador] Validando ${classificacoes.length} classificações...`);
    const classificacoesValidas = classificacoes.map(c => {
      console.log(`[Classificador] Validando: materia_id=${c.materia_id}, materia_nome=${c.materia_nome}`);
      
      // Tentar encontrar matéria por ID primeiro
      let materia = materiasDisponiveis.find(m => m.id === c.materia_id);
      
      // Se não encontrou por ID, tentar por nome (normalizado)
      if (!materia && c.materia_nome) {
        console.log(`[Classificador] Matéria não encontrada por ID, tentando por nome: ${c.materia_nome}`);
        const nomeNormalizado = c.materia_nome.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        materia = materiasDisponiveis.find(m => {
          const mNormalizado = m.nome.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return mNormalizado === nomeNormalizado || 
                 mNormalizado.includes(nomeNormalizado) ||
                 nomeNormalizado.includes(mNormalizado);
        });
        if (materia) {
          console.log(`[Classificador] Matéria encontrada por nome: ${materia.nome} (${materia.id})`);
          c.materia_id = materia.id; // Corrigir ID
          c.materia_nome = materia.nome; // Corrigir nome
        }
      }
      
      if (!materia) {
        console.log(`[Classificador] Matéria não encontrada: ${c.materia_nome}, usando primeira matéria disponível como fallback`);
        // Fallback: usar primeira matéria disponível
        materia = materiasDisponiveis[0];
        if (materia) {
          c.materia_id = materia.id;
          c.materia_nome = materia.nome;
          console.log(`[Classificador] Usando fallback: ${materia.nome} (${materia.id})`);
        } else {
          console.log(`[Classificador] Nenhuma matéria disponível, descartando classificação`);
          return null;
        }
      }
      
      // Se tópico foi especificado, validar
      if (c.topico_id || c.topico_nome) {
        let topico = materia.topicos?.find(t => t.id === c.topico_id);
        
        // Se não encontrou por ID, tentar por nome
        if (!topico && c.topico_nome) {
          console.log(`[Classificador] Tópico não encontrado por ID, tentando por nome: ${c.topico_nome}`);
          topico = materia.topicos?.find(t => 
            t.nome.toLowerCase().includes(c.topico_nome.toLowerCase()) ||
            c.topico_nome.toLowerCase().includes(t.nome.toLowerCase())
          );
          if (topico) {
            console.log(`[Classificador] Tópico encontrado por nome: ${topico.nome} (${topico.id})`);
            c.topico_id = topico.id; // Corrigir ID
            c.topico_nome = topico.nome; // Corrigir nome
          }
        }
        
        // Se tópico foi especificado mas não existe, remover da classificação
        if (c.topico_id && !topico) {
          console.log(`[Classificador] Tópico não encontrado, removendo da classificação`);
          delete c.topico_id;
          delete c.topico_nome;
        }
      }
      
      return c;
    }).filter(c => c !== null) as ClassificacaoSugerida[];
    
    console.log(`[Classificador] Classificações válidas: ${classificacoesValidas.length}/${classificacoes.length}`);
    
    if (classificacoesValidas.length === 0) {
      return {
        sucesso: false,
        classificacoes: [],
        erro: 'IA não conseguiu classificar a questão nas matérias disponíveis'
      };
    }
    
    return {
      sucesso: true,
      classificacoes: classificacoesValidas
    };
    
  } catch (error: any) {
    console.error(`[Classificador] Erro:`, error.message);
    return {
      sucesso: false,
      classificacoes: [],
      erro: error.message
    };
  }
}

/**
 * Classifica uma questão e retorna estatísticas
 */
export async function classificarQuestaoComEstatisticas(
  enunciado: string,
  materiasDisponiveis: MateriaDisponivel[],
  opcoes?: {
    modelo?: string;
    maxClassificacoes?: number;
  }
) {
  const inicio = Date.now();
  const resultado = await classificarQuestao(enunciado, materiasDisponiveis, opcoes);
  const duracao = Date.now() - inicio;
  
  return {
    ...resultado,
    duracao_ms: duracao,
    duracao_segundos: Math.round(duracao / 1000)
  };
}
