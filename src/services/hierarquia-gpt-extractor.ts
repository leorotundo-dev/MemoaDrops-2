import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Subtopico {
  nome: string;
}

interface Topico {
  numero: number;
  titulo: string;
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

Analise o texto do edital e extraia TODAS as matérias/disciplinas com seus tópicos numerados.

REGRAS:
1. Extraia APENAS matérias de concurso (Língua Portuguesa, Matemática, Direito, Informática, etc.)
2. IGNORE: links de navegação, seções administrativas, anexos não-programáticos
3. Para cada matéria, extraia TODOS os tópicos numerados (1, 2, 3, 4...)
4. Para cada tópico, extraia os subtópicos separados por ponto, ponto-e-vírgula ou dois-pontos
5. Mantenha o texto original dos tópicos

EXEMPLO DE EXTRAÇÃO:

TEXTO DO EDITAL:
"LÍNGUA PORTUGUESA
1 Interpretação e compreensão de texto. Organização estrutural dos textos. 2 Marcas de textualidade: coesão, coerência e intertextualidade."

JSON ESPERADO:
{
  "materias": [
    {
      "nome": "Língua Portuguesa",
      "topicos": [
        {
          "numero": 1,
          "titulo": "Interpretação e compreensão de texto. Organização estrutural dos textos.",
          "subtopicos": [
            {"nome": "Interpretação e compreensão de texto"},
            {"nome": "Organização estrutural dos textos"}
          ]
        },
        {
          "numero": 2,
          "titulo": "Marcas de textualidade: coesão, coerência e intertextualidade.",
          "subtopicos": [
            {"nome": "Coesão"},
            {"nome": "Coerência"},
            {"nome": "Intertextualidade"}
          ]
        }
      ]
    }
  ],
  "confidence": "high"
}

TEXTO DO EDITAL:
${pdfText}

Retorne APENAS JSON válido, sem explicações.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
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
      max_tokens: 16000,
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
