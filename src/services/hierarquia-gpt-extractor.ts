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

interface ConcursoInfo {
  orgao?: string;
  ano?: number;
  nivel?: string;
  estado?: string;
  cidade?: string;
  numero_vagas?: number;
  salario_min?: number;
  salario_max?: number;
  data_inscricao_inicio?: string;
  data_inscricao_fim?: string;
  data_prova?: string;
  data_resultado?: string;
  valor_inscricao?: number;
  requisitos?: string;
  tipo_prova?: string;
  carga_horaria?: number;
  regime_juridico?: string;
  jornada_trabalho?: string;
  beneficios?: string;
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

/**
 * Extrai informações gerais do concurso de um texto de edital usando GPT-4
 */
export async function extractConcursoInfoFromText(
  pdfText: string
): Promise<ConcursoInfo> {
  try {
    console.log('[Concurso Info GPT Extractor] Iniciando extração via GPT-4...');

    const prompt = `Você é um especialista em análise de editais de concursos públicos brasileiros.

Analise o texto do edital e extraia as seguintes informações do concurso:

INFORMAÇÕES A EXTRAIR:
1. **orgao**: Nome do órgão/instituição (ex: "Prefeitura Municipal de São Paulo", "Tribunal Regional do Trabalho")
2. **ano**: Ano do concurso (número inteiro)
3. **nivel**: Nível de escolaridade exigido (ex: "Superior", "Médio", "Fundamental", "Técnico")
4. **estado**: Sigla do estado (ex: "SP", "RJ", "MG")
5. **cidade**: Nome da cidade (ex: "São Paulo", "Rio de Janeiro")
6. **numero_vagas**: Número total de vagas (número inteiro, soma de todas as vagas se houver múltiplos cargos)
7. **salario_min**: Menor salário oferecido (número decimal, ex: 3500.50)
8. **salario_max**: Maior salário oferecido (número decimal, ex: 15000.00)
9. **data_inscricao_inicio**: Data de início das inscrições (formato: "YYYY-MM-DD")
10. **data_inscricao_fim**: Data de fim das inscrições (formato: "YYYY-MM-DD")
11. **data_prova**: Data da prova (formato: "YYYY-MM-DD")
12. **data_resultado**: Data prevista do resultado (formato: "YYYY-MM-DD")
13. **valor_inscricao**: Valor da taxa de inscrição (número decimal, ex: 85.50)
14. **requisitos**: Requisitos principais em texto curto (ex: "Ensino superior completo, idade mínima 18 anos, CNH categoria B")
15. **tipo_prova**: Tipos de prova separados por vírgula (ex: "Objetiva, Discursiva, Títulos")
16. **carga_horaria**: Carga horária semanal em horas (número inteiro, ex: 40)
17. **regime_juridico**: Regime jurídico (ex: "Estatutário", "CLT", "Temporário")
18. **jornada_trabalho**: Descrição da jornada (ex: "40 horas semanais", "Dedicação exclusiva")
19. **beneficios**: Benefícios oferecidos em texto curto (ex: "Vale-alimentação, vale-transporte, plano de saúde")

REGRAS:
- Se uma informação NÃO estiver claramente no texto, NÃO invente, deixe como null
- Para datas, converta para formato ISO (YYYY-MM-DD)
- Para salários, extraia apenas o valor numérico (sem "R$" ou pontos de milhar)
- Se houver múltiplos cargos com salários diferentes, use o menor e o maior
- Se houver apenas um salário, coloque o mesmo valor em salario_min e salario_max
- Para nível, use apenas: "Superior", "Médio", "Fundamental", "Técnico", ou "Misto" se houver vários
- Indique confidence: "high" se encontrou 80%+ das informações, "medium" se 50-79%, "low" se menos de 50%

EXEMPLO DE JSON:
{
  "orgao": "Prefeitura Municipal de São Paulo",
  "ano": 2025,
  "nivel": "Superior",
  "estado": "SP",
  "cidade": "São Paulo",
  "numero_vagas": 150,
  "salario_min": 3500.00,
  "salario_max": 15000.00,
  "data_inscricao_inicio": "2025-07-01",
  "data_inscricao_fim": "2025-07-31",
  "data_prova": "2025-10-15",
  "data_resultado": "2025-11-30",
  "valor_inscricao": 85.50,
  "requisitos": "Ensino superior completo em qualquer área, idade mínima 18 anos",
  "tipo_prova": "Objetiva, Discursiva, Títulos",
  "carga_horaria": 40,
  "regime_juridico": "Estatutário",
  "jornada_trabalho": "40 horas semanais",
  "beneficios": "Vale-alimentação R$ 800, vale-transporte, plano de saúde",
  "confidence": "high"
}

TEXTO DO EDITAL:
${pdfText.substring(0, 15000)}

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
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.log('[Concurso Info GPT Extractor] GPT-4 retornou resposta vazia');
      return { confidence: 'low' };
    }

    console.log('[Concurso Info GPT Extractor] Resposta recebida do GPT-4');
    console.log('[Concurso Info GPT Extractor] Resposta completa:', content);

    const parsed: ConcursoInfo = JSON.parse(content);

    console.log(`[Concurso Info GPT Extractor] Confidence: ${parsed.confidence}`);

    return parsed;
  } catch (error: any) {
    console.error('[Concurso Info GPT Extractor] Erro:', error.message);
    return { confidence: 'low' };
  }
}
