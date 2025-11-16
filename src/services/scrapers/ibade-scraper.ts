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
      await page.goto(`${this.baseUrl}/edital`, { waitUntil: 'networkidle2', timeout: 60000 });

      // Aguardar a aba "INSCRIÇÕES ABERTAS" carregar
      await page.waitForSelector('a[href*="inscricoes-abertas"], a:contains("INSCRIÇÕES ABERTAS")', { timeout: 10000 });

      // Extrair concursos da aba ativa (INSCRIÇÕES ABERTAS é a padrão)
      const concursos = await page.evaluate(() => {
        const results: Array<{name: string; contestUrl: string}> = [];
        
        // Procurar todos os cards de concursos
        const cards = document.querySelectorAll('[class*="card"], [class*="concurso"], [class*="edital"]');
        
        cards.forEach((card) => {
          // Procurar nome do concurso (geralmente em h3, h4, ou strong)
          const nameEl = card.querySelector('h3, h4, strong, [class*="titulo"], [class*="nome"]');
          let name = nameEl?.textContent?.trim();
          
          // Se não encontrou, procurar em divs com texto
          if (!name) {
            const textDivs = card.querySelectorAll('div');
            for (const div of textDivs) {
              const text = div.textContent?.trim();
              if (text && text.length > 10 && text.length < 200) {
                name = text;
                break;
              }
            }
          }
          
          // Procurar link "Inscrições Abertas" ou similar
          const linkEl = card.querySelector('a[href*="/edital/ver/"], a[href*="/ver/"]');
          const href = linkEl?.getAttribute('href');
          
          if (name && href) {
            results.push({
              name,
              contestUrl: href.startsWith('http') 
                ? href 
                : `https://portal.ibade.selecao.site${href}`,
            });
          }
        });

        return results;
      });

      await browser.close();
      
      console.log(`[IBADE] Encontrados ${concursos.length} concursos`);
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
      await page.goto(contestUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Aguardar seção de arquivos carregar
      await page.waitForSelector('[class*="arquivo"], a[href*=".pdf"]', { timeout: 10000 });

      // Procurar link "EDITAL DE ABERTURA"
      const editalUrl = await page.evaluate(() => {
        // Procurar todos os links e textos
        const allElements = Array.from(document.querySelectorAll('*'));
        
        for (const el of allElements) {
          const text = el.textContent?.toUpperCase() || '';
          
          // Verificar se é edital de abertura
          if (text.includes('EDITAL') && text.includes('ABERTURA')) {
            // Procurar link PDF próximo
            const link = el.querySelector('a[href*=".pdf"]') || 
                        el.closest('a[href*=".pdf"]') ||
                        el.parentElement?.querySelector('a[href*=".pdf"]');
            
            if (link) {
              const href = link.getAttribute('href');
              if (href) {
                return href.startsWith('http') ? href : `https://portal.ibade.selecao.site${href}`;
              }
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
    
    console.log(`[IBADE] Extraindo URLs de ${concursos.length} concursos...`);
    
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
