import puppeteer from 'puppeteer';

export interface FgvConcurso {
  name: string;
  url: string;
  editalUrl?: string;
}

export class FgvScraper {
  private browser: any = null;

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeList(): Promise<FgvConcurso[]> {
    await this.init();
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://conhecimento.fgv.br/concursos', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Aguardar cards carregarem
      await page.waitForSelector('.card', { timeout: 10000 });

      // Extrair concursos
      const concursos = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.card'));
        return cards.map(card => {
          const link = card.querySelector('a');
          const title = card.querySelector('h3, h4, .card-title');
          
          if (!link || !title) return null;
          
          return {
            name: title.textContent?.trim() || '',
            url: link.href || ''
          };
        }).filter(c => c !== null && c.name && c.url);
      });

      return concursos as FgvConcurso[];
    } catch (error) {
      console.error('Erro ao scrapear lista FGV:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  async extractEditalUrl(concursoUrl: string): Promise<string | null> {
    await this.init();
    const page = await this.browser.newPage();
    
    try {
      await page.goto(concursoUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Procurar link de edital de abertura
      const editalUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        
        // Procurar por "EDITAL DE ABERTURA" ou similar
        const editalLink = links.find(link => {
          const text = link.textContent?.toUpperCase() || '';
          return text.includes('EDITAL') && 
                 text.includes('ABERTURA') &&
                 !text.includes('RETIFICAÇÃO') &&
                 !text.includes('RETIFICACAO');
        });

        return editalLink?.href || null;
      });

      return editalUrl;
    } catch (error) {
      console.error(`Erro ao extrair edital de ${concursoUrl}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  async scrapeWithEditais(limit: number = 10): Promise<FgvConcurso[]> {
    const concursos = await this.scrapeList();
    const concursosLimitados = concursos.slice(0, limit);
    
    // Extrair URLs de editais
    for (const concurso of concursosLimitados) {
      concurso.editalUrl = await this.extractEditalUrl(concurso.url) || undefined;
    }
    
    return concursosLimitados;
  }
}
