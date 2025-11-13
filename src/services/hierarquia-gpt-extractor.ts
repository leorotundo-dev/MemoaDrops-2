import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SubSubtopico {
  nome: string;
  descricao?: string;
}

interface Subtopico {
  nome: string;
  descricao?: string;
  subsubtopicos: SubSubtopico[];
}

interface Topico {
  nome: string;
  descricao?: string;
  subtopicos: Subtopico[];
}

interface Materia {
  nome: string;
  topicos: Topico[];
}

interface HierarquiaExtraida {
  materias: Materia[];
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Extrai hierarquia completa de matérias/tópicos/subtópicos de um texto de edital usando GPT-4
 */
export async function extractHierarquiaFromText(
  pdfText: string
): Promise<HierarquiaExtraida> {
  try {
    console.log('[Hierarquia GPT Extractor] Iniciando extração via GPT-4...');
    console.log(`[Hierarquia GPT Extractor] Tamanho do texto: ${pdfText.length} caracteres`);

    const prompt = `Você é um especialista em análise de editais de concursos públicos brasileiros.

Analise o texto do edital abaixo e extraia a estrutura hierárquica completa do CONTEÚDO PROGRAMÁTICO:

IMPORTANTE:
- Extraia APENAS disciplinas/matérias reais de concursos (ex: Língua Portuguesa, Matemática, Direito, Informática)
- IGNORE links de navegação (Início, Fale Conosco, Contato, etc.)
- IGNORE seções administrativas do edital (Inscrições, Recursos, Cronograma, etc.)
- Organize em hierarquia: Matéria → Tópico → Subtópico → Sub-subtópico

ESTRUTURA ESPERADA:
{
  "materias": [
    {
      "nome": "Língua Portuguesa",
      "topicos": [
        {
          "nome": "Gramática",
          "descricao": "Estudo das regras gramaticais",
          "subtopicos": [
            {
              "nome": "Morfologia",
              "descricao": "Classes gramaticais",
              "subsubtopicos": [
                { "nome": "Substantivos" },
                { "nome": "Verbos" },
                { "nome": "Adjetivos" }
              ]
            },
            {
              "nome": "Sintaxe",
              "descricao": "Estrutura das frases",
              "subsubtopicos": [
                { "nome": "Análise Sintática" },
                { "nome": "Período Composto" }
              ]
            }
          ]
        },
        {
          "nome": "Interpretação de Texto",
          "subtopicos": [
            {
              "nome": "Compreensão Textual",
              "subsubtopicos": []
            }
          ]
        }
      ]
    }
  ],
  "confidence": "high"
}

REGRAS:
1. Se não encontrar conteúdo programático claro, retorne array vazio com confidence "low"
2. Use confidence "medium" se encontrar apenas lista simples de matérias
3. Use confidence "high" se encontrar estrutura hierárquica completa
4. Mantenha nomes em português correto
5. Adicione descrições quando relevante

TEXTO DO EDITAL:
${pdfText}

Retorne APENAS o JSON, sem explicações.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise de editais de concursos públicos. Retorne apenas JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.log('[Hierarquia GPT Extractor] GPT-4 retornou resposta vazia');
      return { materias: [], confidence: 'low' };
    }

    console.log('[Hierarquia GPT Extractor] Resposta recebida do GPT-4');
    console.log('[Hierarquia GPT Extractor] Resposta completa:', content);

    const parsed: HierarquiaExtraida = JSON.parse(content);

    console.log(`[Hierarquia GPT Extractor] ${parsed.materias.length} matérias extraídas`);
    console.log(`[Hierarquia GPT Extractor] Confidence: ${parsed.confidence}`);

    return parsed;
  } catch (error: any) {
    console.error('[Hierarquia GPT Extractor] Erro:', error.message);
    return { materias: [], confidence: 'low' };
  }
}

/**
 * Gera slug a partir de um nome (remove acentos, espaços, caracteres especiais)
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
}
