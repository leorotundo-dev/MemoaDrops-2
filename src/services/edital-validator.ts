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

  // Se não tem nem blacklist nem whitelist, aceitar se:
  // 1. Tem "edital" + "concurso"
  // 2. Tem siglas de órgãos públicos (PC, TJ, SEFA, etc.) + ano
  const hasEdital = lowerText.includes('edital');
  const hasConcurso = lowerText.includes('concurso') || lowerText.includes('processo seletivo');
  
  if (hasEdital && hasConcurso) {
    console.log(`[Edital Validator] Aceito por padrão (edital + concurso): "${text}"`);
    return true;
  }
  
  // Aceitar siglas de órgãos públicos com ano (ex: "PC MG 25", "TJ CE 25", "SEFA PR 25")
  const publicOrgPattern = /\b(pc|tj|tce|tcu|pf|prf|pm|sefa|sefaz|pgm|pge|anac|ans|antt|anvisa|bcb|inss|mre|stm|fub|embrapa|fnde|banrisul|caesb|cau)\b.*\b(20\d{2}|\d{2})\b/i;
  if (publicOrgPattern.test(text)) {
    console.log(`[Edital Validator] Aceito por padrão (órgão público + ano): "${text}"`);
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
    
    // Procurar links de PDF no HTML com contexto (para filtrar editais de abertura)
    const pdfLinkRegex = /<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>([^<]*)</gi;
    const matches = [...html.matchAll(pdfLinkRegex)];
    
    if (matches.length > 0) {
      // Priorizar links com "Edital" e "Abertura" no texto
      let pdfUrl = null;
      
      for (const match of matches) {
        const linkUrl = match[1];
        const linkText = match[2].toLowerCase();
        
        // Priorizar "Edital nº 1 - Abertura" ou similar
        if (linkText.includes('edital') && linkText.includes('abertura') && !linkText.includes('acessível') && !linkText.includes('vlibras')) {
          pdfUrl = linkUrl;
          console.log(`[Edital Validator] Encontrado edital de abertura: "${match[2]}"`);
          break;
        }
      }
      
      // Se não encontrou edital de abertura, pegar o primeiro PDF
      if (!pdfUrl && matches.length > 0) {
        pdfUrl = matches[0][1];
        console.log(`[Edital Validator] Usando primeiro PDF encontrado`);
      }
      
      if (pdfUrl) {
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
