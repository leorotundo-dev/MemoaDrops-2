import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface IbadeConcurso {
  name: string;
  contestUrl: string;
  editalUrl?: string;
}

export class IbadeScraper {
  private baseUrl = 'https://portal.ibade.selecao.site';

  /**
   * Scrape lista de concursos com inscrições abertas
   */
  async scrapeAbertos(): Promise<IbadeConcurso[]> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(`${this.baseUrl}/edital`, { waitUntil: 'networkidle2' });

      // Clicar na aba "INSCRIÇÕES ABERTAS"
      await page.click('a:has-text("INSCRIÇÕES ABERTAS")');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extrair concursos
      const concursos = await page.evaluate(() => {
        const results: IbadeConcurso[] = [];
        const cards = document.querySelectorAll('.card, [class*="concurso"], [class*="edital"]');

        cards.forEach((card) => {
          // Procurar nome do concurso
          const nameEl = card.querySelector('h2, h3, h4, .title, [class*="nome"]');
          const name = nameEl?.textContent?.trim();

          // Procurar link para página do concurso
          const linkEl = card.querySelector('a[href*="/edital/ver/"]');
          const contestUrl = linkEl?.getAttribute('href');

          if (name && contestUrl) {
            results.push({
              name,
              contestUrl: contestUrl.startsWith('http') 
                ? contestUrl 
                : `https://portal.ibade.selecao.site${contestUrl}`,
            });
          }
        });

        return results;
      });

      await browser.close();
      return concursos;
    } catch (error) {
      console.error('Erro ao scrape IBADE:', error);
      return [];
    }
  }

  /**
   * Extrai URL do edital de abertura de um concurso específico
   */
  async extractEditalUrl(contestUrl: string): Promise<string | null> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(contestUrl, { waitUntil: 'networkidle2' });

      // Procurar link "EDITAL DE ABERTURA" ou "Edital de Abertura"
      const editalUrl = await page.evaluate(() => {
        // Procurar todos os links de download
        const downloadLinks = Array.from(document.querySelectorAll('a[href*=".pdf"], a:has-text("DOWNLOAD")'));

        for (const link of downloadLinks) {
          const text = link.textContent?.toUpperCase() || '';
          const previousText = link.previousElementSibling?.textContent?.toUpperCase() || '';
          const parentText = link.parentElement?.textContent?.toUpperCase() || '';

          // Verificar se é edital de abertura
          if (
            text.includes('EDITAL') && text.includes('ABERTURA') ||
            previousText.includes('EDITAL') && previousText.includes('ABERTURA') ||
            parentText.includes('EDITAL') && parentText.includes('ABERTURA')
          ) {
            const href = link.getAttribute('href');
            if (href && href.includes('.pdf')) {
              return href.startsWith('http') ? href : `https://portal.ibade.selecao.site${href}`;
            }
          }
        }

        return null;
      });

      await browser.close();
      return editalUrl;
    } catch (error) {
      console.error(`Erro ao extrair edital de ${contestUrl}:`, error);
      return null;
    }
  }

  /**
   * Scrape completo: lista concursos E extrai URLs dos editais
   */
  async scrapeCompleto(): Promise<IbadeConcurso[]> {
    const concursos = await this.scrapeAbertos();
    
    // Extrair URLs dos editais em paralelo (com limite de 3 simultâneos)
    const results: IbadeConcurso[] = [];
    
    for (let i = 0; i < concursos.length; i += 3) {
      const batch = concursos.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(async (concurso) => {
          const editalUrl = await this.extractEditalUrl(concurso.contestUrl);
          return { ...concurso, editalUrl: editalUrl || undefined };
        })
      );
      results.push(...batchResults);
      
      // Delay entre batches para não sobrecarregar
      if (i + 3 < concursos.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}
