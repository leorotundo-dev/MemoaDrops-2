import { Page } from 'playwright';

/**
 * Extrai URL do edital de abertura de uma página de concurso
 * 
 * @param page - Página do Playwright já carregada
 * @param contestUrl - URL do concurso (para logs)
 * @returns URL do PDF do edital ou null se não encontrado
 */
export async function extractEditalUrl(page: Page, contestUrl: string): Promise<string | null> {
  try {
    // Aguardar um pouco para garantir que o conteúdo carregou
    await page.waitForTimeout(1000);
    
    // Extrair link do PDF do edital de abertura
    const editalUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      
      // Prioridade 1: Edital de Abertura específico
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        const href = link.getAttribute('href') || '';
        
        if (
          text.includes('edital') &&
          text.includes('abertura') &&
          !text.includes('acessível') &&
          !text.includes('vlibras') &&
          !text.includes('retificação') &&
          !text.includes('retificacao') &&
          href &&
          href.includes('.pdf')
        ) {
          // Retornar URL absoluta
          return new URL(href, window.location.href).href;
        }
      }
      
      // Prioridade 2: Qualquer edital em PDF (sem retificação)
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        const href = link.getAttribute('href') || '';
        
        if (
          text.includes('edital') &&
          !text.includes('acessível') &&
          !text.includes('vlibras') &&
          !text.includes('retificação') &&
          !text.includes('retificacao') &&
          href &&
          href.includes('.pdf')
        ) {
          return new URL(href, window.location.href).href;
        }
      }
      
      return null;
    });
    
    if (editalUrl) {
      console.log(`[Edital Extractor] ✅ Encontrado: ${editalUrl}`);
      return editalUrl;
    } else {
      console.log(`[Edital Extractor] ⚠️ Nenhum PDF encontrado em: ${contestUrl}`);
      return null;
    }
    
  } catch (error) {
    console.error(`[Edital Extractor] ❌ Erro ao extrair edital de ${contestUrl}:`, error);
    return null;
  }
}

/**
 * Extrai URL do edital usando Cheerio (para modo static)
 * 
 * @param $ - Instância do Cheerio
 * @param contestUrl - URL do concurso (para construir URL absoluta)
 * @returns URL do PDF do edital ou null se não encontrado
 */
export function extractEditalUrlStatic($: any, contestUrl: string): string | null {
  try {
    const links = $('a').toArray();
    
    // Prioridade 1: Edital de Abertura específico
    for (const link of links) {
      const text = $(link).text().trim().toLowerCase();
      const href = $(link).attr('href') || '';
      
      if (
        text.includes('edital') &&
        text.includes('abertura') &&
        !text.includes('acessível') &&
        !text.includes('vlibras') &&
        !text.includes('retificação') &&
        !text.includes('retificacao') &&
        href &&
        href.includes('.pdf')
      ) {
        // Retornar URL absoluta
        return new URL(href, contestUrl).href;
      }
    }
    
    // Prioridade 2: Qualquer edital em PDF
    for (const link of links) {
      const text = $(link).text().trim().toLowerCase();
      const href = $(link).attr('href') || '';
      
      if (
        text.includes('edital') &&
        !text.includes('acessível') &&
        !text.includes('vlibras') &&
        !text.includes('retificação') &&
        !text.includes('retificacao') &&
        href &&
        href.includes('.pdf')
      ) {
        return new URL(href, contestUrl).href;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`[Edital Extractor Static] ❌ Erro ao extrair edital de ${contestUrl}:`, error);
    return null;
  }
}
