import axios from 'axios';

/**
 * Palavras-chave que indicam que NÃO é um edital de abertura
 */
const BLACKLIST_KEYWORDS = [
  'retificação',
  'retificacao',
  'resultado',
  'gabarito',
  'homologação',
  'homologacao',
  'convocação',
  'convocacao',
  'classificação',
  'classificacao',
  'aprovados',
  'lista',
  'nomeação',
  'nomeacao',
  'prorrogação',
  'prorrogacao',
  'suspensão',
  'suspensao',
  'cancelamento',
  'adiamento',
  'alteração',
  'alteracao',
  'errata',
  'aviso',
  'comunicado',
  'republicação',
  'republicacao',
  'ratificação',
  'ratificacao',
  'ata',
  'recurso',
  'impugnação',
  'impugnacao',
  'complementar',
  'suplementar',
  'anexo',
  'adendo',
];

/**
 * Palavras-chave que indicam que É um edital de abertura
 */
const WHITELIST_KEYWORDS = [
  'edital de abertura',
  'edital completo',
  'edital nº',
  'edital n°',
  'edital n.',
  'edital consolidado',
  'concurso público',
  'concurso publico',
  'processo seletivo',
  'seleção pública',
  'selecao publica',
];

/**
 * Verifica se um texto parece ser um edital de abertura válido
 */
export function isValidEditalText(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Se contém palavras da blacklist, rejeitar
  for (const keyword of BLACKLIST_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      console.log(`[Edital Validator] Rejeitado por blacklist: "${keyword}" em "${text}"`);
      return false;
    }
  }

  // Se contém palavras da whitelist, aceitar
  for (const keyword of WHITELIST_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      console.log(`[Edital Validator] Aceito por whitelist: "${keyword}" em "${text}"`);
      return true;
    }
  }

  // Se não tem nem blacklist nem whitelist, aceitar apenas se tiver "edital" + "concurso"
  const hasEdital = lowerText.includes('edital');
  const hasConcurso = lowerText.includes('concurso') || lowerText.includes('processo seletivo');
  
  if (hasEdital && hasConcurso) {
    console.log(`[Edital Validator] Aceito por padrão (edital + concurso): "${text}"`);
    return true;
  }

  console.log(`[Edital Validator] Rejeitado (não atende critérios): "${text}"`);
  return false;
}

/**
 * Valida se uma URL aponta para um PDF válido
 */
export async function validatePdfUrl(url: string): Promise<{ valid: boolean; message: string; pdfUrl?: string }> {
  try {
    // Se a URL já termina com .pdf, validar diretamente
    if (url.toLowerCase().endsWith('.pdf')) {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });

      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/pdf')) {
        return {
          valid: true,
          message: 'PDF válido',
          pdfUrl: url,
        };
      } else {
        return {
          valid: false,
          message: `Content-Type inválido: ${contentType}`,
        };
      }
    }

    // Se não termina com .pdf, fazer GET e procurar link de PDF na página
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      maxRedirects: 5,
    });

    const html = response.data;
    
    // Procurar links de PDF no HTML
    const pdfLinkRegex = /href=["']([^"']*\.pdf[^"']*)["']/gi;
    const matches = [...html.matchAll(pdfLinkRegex)];
    
    if (matches.length > 0) {
      // Pegar o primeiro link de PDF encontrado
      let pdfUrl = matches[0][1];
      
      // Construir URL completa se for relativa
      if (!pdfUrl.startsWith('http')) {
        const baseUrl = new URL(url);
        pdfUrl = new URL(pdfUrl, baseUrl.origin).toString();
      }

      // Validar o PDF encontrado
      const pdfValidation = await validatePdfUrl(pdfUrl);
      if (pdfValidation.valid) {
        return {
          valid: true,
          message: 'PDF encontrado na página',
          pdfUrl: pdfUrl,
        };
      }
    }

    return {
      valid: false,
      message: 'Nenhum PDF encontrado na página',
    };

  } catch (error: any) {
    return {
      valid: false,
      message: `Erro ao acessar URL: ${error.message}`,
    };
  }
}

/**
 * Extrai URL de PDF de uma página de concurso
 */
export async function extractPdfFromContestPage(contestUrl: string): Promise<string | null> {
  try {
    const validation = await validatePdfUrl(contestUrl);
    return validation.pdfUrl || null;
  } catch (error) {
    console.error(`[Edital Validator] Erro ao extrair PDF de ${contestUrl}:`, error);
    return null;
  }
}
