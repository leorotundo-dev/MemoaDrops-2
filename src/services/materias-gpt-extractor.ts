import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MateriasExtractionResult {
  materias: string[];
  confidence: 'high' | 'medium' | 'low';
  raw_response?: string;
}

/**
 * Extrai lista de matérias de um texto de edital usando GPT-4
 */
export async function extractMateriasWithGPT(editalText: string, contestName: string): Promise<MateriasExtractionResult> {
  try {
    console.log(`[Materias GPT Extractor] Extraindo matérias para: ${contestName}`);
    
    // Limitar tamanho do texto para não exceder limites da API
    const maxChars = 15000;
    const textToAnalyze = editalText.length > maxChars 
      ? editalText.substring(0, maxChars) + '\n\n[TEXTO TRUNCADO]'
      : editalText;
    
    const prompt = `Você é um especialista em análise de editais de concursos públicos brasileiros.

Analise o texto do edital abaixo e extraia TODAS as matérias/disciplinas/conhecimentos que serão cobrados na prova.

INSTRUÇÕES IMPORTANTES:
1. Procure por seções com títulos como: "CONTEÚDO PROGRAMÁTICO", "MATÉRIAS", "DISCIPLINAS", "CONHECIMENTOS", "ÁREAS DE CONHECIMENTO", "ANEXO"
2. Liste APENAS as matérias/disciplinas principais (ex: "Língua Portuguesa", "Matemática", "Direito Constitucional")
3. NÃO inclua tópicos específicos, sub-itens ou conteúdos detalhados
4. Use nomes padronizados e completos das matérias
5. Separe matérias diferentes mesmo que estejam agrupadas
6. Aceite variações: "Conhecimentos de Português" = "Língua Portuguesa"
7. **IGNORE COMPLETAMENTE:** links de navegação ("Início", "Fale Conosco", "Contato", "Sobre"), nomes de seções do site, menus, rodapés
8. **IGNORE:** nomes de cargos, órgãos, cidades, datas, valores
9. Retorne em formato JSON com array "materias"
10. Se não encontrar matérias VÁLIDAS, retorne array vazio

EXEMPLOS DE MATÉRIAS VÁLIDAS:
- "Língua Portuguesa" (ou "Português", "Conhecimentos de Português")
- "Matemática" (ou "Raciocínio Lógico-Matemático")
- "Raciocínio Lógico"
- "Direito Constitucional"
- "Direito Administrativo"
- "Informática" (ou "Noções de Informática")
- "Conhecimentos Gerais" (ou "Atualidades")

CONCURSO: ${contestName}

TEXTO DO EDITAL:
${textToAnalyze}

Retorne APENAS um JSON válido no formato:
{
  "materias": ["Matéria 1", "Matéria 2", ...],
  "confidence": "high|medium|low"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em análise de editais de concursos públicos. Retorne sempre JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia do GPT-4');
    }
    
    console.log(`[Materias GPT Extractor] Resposta recebida do GPT-4`);
    console.log(`[Materias GPT Extractor] Resposta completa:`, content);
    
    // Parse JSON
    const result = JSON.parse(content);
    
    if (!result.materias || !Array.isArray(result.materias)) {
      throw new Error('Formato de resposta inválido');
    }
    
    // Lista de termos inválidos (links de navegação, menus, etc)
    const invalidTerms = [
      'início', 'home', 'fale conosco', 'contato', 'sobre', 'quem somos',
      'notícias', 'imprensa', 'links', 'downloads', 'documentos',
      'edital', 'inscrição', 'inscrições', 'resultado', 'gabarito',
      'acessibilidade', 'mapa do site', 'busca', 'pesquisa',
      'voltar', 'próximo', 'anterior', 'menu', 'navegação'
    ];
    
    // Limpar e normalizar matérias
    const materias = result.materias
      .filter((m: any) => typeof m === 'string' && m.trim().length > 0)
      .map((m: string) => m.trim())
      .filter((m: string) => {
        const lower = m.toLowerCase();
        // Filtrar matérias muito curtas ou longas
        if (m.length < 3 || m.length > 100) return false;
        // Filtrar termos inválidos
        if (invalidTerms.some(term => lower === term || lower.includes(term))) return false;
        // Filtrar se começa com número (provavelmente é item de lista)
        if (/^\d/.test(m)) return false;
        return true;
      })
      .slice(0, 50); // Limitar a 50 matérias
    
    console.log(`[Materias GPT Extractor] ${materias.length} matérias extraídas`);
    
    return {
      materias,
      confidence: result.confidence || 'medium',
      raw_response: content,
    };
    
  } catch (error: any) {
    console.error(`[Materias GPT Extractor] Erro ao extrair matérias:`, error.message);
    throw error;
  }
}

/**
 * Extrai matérias com retry em caso de falha
 */
export async function extractMateriasWithRetry(
  editalText: string, 
  contestName: string, 
  maxRetries: number = 2
): Promise<MateriasExtractionResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Materias GPT Extractor] Tentativa ${attempt}/${maxRetries}`);
      return await extractMateriasWithGPT(editalText, contestName);
    } catch (error: any) {
      lastError = error;
      console.error(`[Materias GPT Extractor] Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt < maxRetries) {
        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  
  throw lastError || new Error('Falha ao extrair matérias após múltiplas tentativas');
}
