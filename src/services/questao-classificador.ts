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

Analise a questão abaixo e identifique a(s) matéria(s) e tópico(s) que ela aborda.

MATÉRIAS E TÓPICOS DISPONÍVEIS:
${materiasTexto}

QUESTÃO:
${enunciado}

INSTRUÇÕES:
1. Identifique a matéria principal da questão
2. Se houver tópicos disponíveis, identifique o tópico mais específico
3. Atribua uma relevância de 0.0 a 1.0 (1.0 = totalmente relevante)
4. Forneça uma breve justificativa
5. Se a questão abordar múltiplas matérias, liste até ${opcoes?.maxClassificacoes || 2}
6. Retorne APENAS matérias e tópicos da lista fornecida

Formato de saída (JSON):
{
  "classificacoes": [
    {
      "materia_id": "uuid-da-materia",
      "materia_nome": "Nome da Matéria",
      "topico_id": "uuid-do-topico",
      "topico_nome": "Nome do Tópico",
      "relevancia": 1.0,
      "justificativa": "Breve explicação"
    }
  ]
}`;

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
      temperature: 0.2, // Baixa temperatura para maior consistência
      response_format: { type: 'json_object' }
    });
    
    const resposta = completion.choices[0].message.content;
    if (!resposta) {
      throw new Error('GPT-4 retornou resposta vazia');
    }
    
    console.log(`[Classificador] Resposta recebida do GPT-4`);
    
    // Parsear resposta JSON
    const dados = JSON.parse(resposta);
    const classificacoes: ClassificacaoSugerida[] = dados.classificacoes || [];
    
    // Validar classificações
    const classificacoesValidas = classificacoes.filter(c => {
      // Verificar se materia_id existe na lista
      const materiaExiste = materiasDisponiveis.some(m => m.id === c.materia_id);
      
      // Se tópico foi especificado, verificar se existe
      if (c.topico_id) {
        const materia = materiasDisponiveis.find(m => m.id === c.materia_id);
        const topicoExiste = materia?.topicos?.some(t => t.id === c.topico_id);
        return materiaExiste && topicoExiste;
      }
      
      return materiaExiste;
    });
    
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
