// @ts-nocheck
import { Page } from 'playwright';

/**
 * Nomes alternativos para editais
 */
const EDITAL_KEYWORDS = [
  'edital',
  'regulamento',
  'instrução normativa',
  'instrucao normativa',
  'normas do concurso',
  'documento do concurso'
];

/**
 * Formatos aceitos de documentos
 */
const ACCEPTED_FORMATS = ['.pdf', '.zip', '.doc', '.docx'];

/**
 * Palavras para excluir (não são editais principais)
 */
const EXCLUDE_KEYWORDS = [
  'acessível',
  'acessivel',
  'vlibras',
  'retificação',
  'retificacao',
  'errata',
  'alteração',
  'alteracao',
  'complementar',
  'republicação',
  'republicacao'
];

/**
 * Extrai URL do edital de abertura de uma página de concurso
 * 
 * @param page - Página do Playwright já carregada
 * @param contestUrl - URL do concurso (para logs)
 * @returns URL do documento do edital ou null se não encontrado
 */
export async function extractEditalUrl(page: Page, contestUrl: string): Promise<string | null> {
  try {
    // Aguardar um pouco para garantir que o conteúdo carregou
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extrair link do documento do edital
    const editalUrl = await page.evaluate((keywords, formats, excludes) => {
      const links = Array.from(document.querySelectorAll('a'));
      
      // Prioridade 1: Edital de Abertura específico
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        const href = link.getAttribute('href') || '';
        
        // Verificar se contém alguma palavra-chave de edital
        const hasKeyword = keywords.some(k => text.includes(k));
        const hasAbertura = text.includes('abertura');
        const hasExclude = excludes.some(e => text.includes(e));
        const hasFormat = formats.some(f => href.toLowerCase().includes(f));
        
        if (hasKeyword && hasAbertura && !hasExclude && href && hasFormat) {
          return new URL(href, window.location.href).href;
        }
      }
      
      // Prioridade 2: Qualquer edital (sem palavras excluídas)
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        const href = link.getAttribute('href') || '';
        
        const hasKeyword = keywords.some(k => text.includes(k));
        const hasExclude = excludes.some(e => text.includes(e));
        const hasFormat = formats.some(f => href.toLowerCase().includes(f));
        
        if (hasKeyword && !hasExclude && href && hasFormat) {
          return new URL(href, window.location.href).href;
        }
      }
      
      // Prioridade 3: Link com "edital" no href (mesmo sem texto)
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const hrefLower = href.toLowerCase();
        
        const hasKeyword = keywords.some(k => hrefLower.includes(k));
        const hasExclude = excludes.some(e => hrefLower.includes(e));
        const hasFormat = formats.some(f => hrefLower.includes(f));
        
        if (hasKeyword && !hasExclude && href && hasFormat) {
          return new URL(href, window.location.href).href;
        }
      }
      
      return null;
    }, EDITAL_KEYWORDS, ACCEPTED_FORMATS, EXCLUDE_KEYWORDS);
    
    if (editalUrl) {
      const format = ACCEPTED_FORMATS.find(f => editalUrl.toLowerCase().includes(f)) || 'unknown';
      console.log(`[Edital Extractor] ✅ Encontrado (${format}): ${editalUrl}`);
      return editalUrl;
    } else {
      console.log(`[Edital Extractor] ⚠️ Nenhum documento encontrado em: ${contestUrl}`);
      return null;
    }
    
  } catch (error: any) {
    console.error(`[Edital Extractor] ❌ Erro ao extrair edital de ${contestUrl}:`, error.message);
    return null;
  }
}

/**
 * Extrai URL do edital usando Cheerio (para modo static)
 * 
 * @param $ - Instância do Cheerio
 * @param contestUrl - URL do concurso (para construir URL absoluta)
 * @returns URL do documento do edital ou null se não encontrado
 */
export function extractEditalUrlStatic($: any, contestUrl: string): string | null {
  try {
    const links = $('a').toArray();
    
    // Prioridade 1: Edital de Abertura específico
    for (const link of links) {
      const text = $(link).text().trim().toLowerCase();
      const href = $(link).attr('href') || '';
      
      const hasKeyword = EDITAL_KEYWORDS.some(k => text.includes(k));
      const hasAbertura = text.includes('abertura');
      const hasExclude = EXCLUDE_KEYWORDS.some(e => text.includes(e));
      const hasFormat = ACCEPTED_FORMATS.some(f => href.toLowerCase().includes(f));
      
      if (hasKeyword && hasAbertura && !hasExclude && href && hasFormat) {
        return new URL(href, contestUrl).href;
      }
    }
    
    // Prioridade 2: Qualquer edital (sem palavras excluídas)
    for (const link of links) {
      const text = $(link).text().trim().toLowerCase();
      const href = $(link).attr('href') || '';
      
      const hasKeyword = EDITAL_KEYWORDS.some(k => text.includes(k));
      const hasExclude = EXCLUDE_KEYWORDS.some(e => text.includes(e));
      const hasFormat = ACCEPTED_FORMATS.some(f => href.toLowerCase().includes(f));
      
      if (hasKeyword && !hasExclude && href && hasFormat) {
        return new URL(href, contestUrl).href;
      }
    }
    
    // Prioridade 3: Link com "edital" no href
    for (const link of links) {
      const href = $(link).attr('href') || '';
      const hrefLower = href.toLowerCase();
      
      const hasKeyword = EDITAL_KEYWORDS.some(k => hrefLower.includes(k));
      const hasExclude = EXCLUDE_KEYWORDS.some(e => hrefLower.includes(e));
      const hasFormat = ACCEPTED_FORMATS.some(f => hrefLower.includes(f));
      
      if (hasKeyword && !hasExclude && href && hasFormat) {
        return new URL(href, contestUrl).href;
      }
    }
    
    return null;
    
  } catch (error: any) {
    console.error(`[Edital Extractor Static] ❌ Erro ao extrair edital de ${contestUrl}:`, error.message);
    return null;
  }
}
