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

      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extrair concursos
      const concursos = await page.evaluate(() => {
        const results: Array<{name: string; contestUrl: string}> = [];
        
        // Procurar todos os links "Inscrições Abertas"
        const links = Array.from(document.querySelectorAll('a'));
        const inscricoesLinks = links.filter(a => 
          a.textContent?.trim() === 'Inscrições Abertas' && 
          a.href.includes('/edital/ver/')
        );
        
        // Para cada link, procurar o nome do concurso acima dele
        inscricoesLinks.forEach((link) => {
          // Pegar o elemento pai do link
          let parent = link.parentElement;
          let attempts = 0;
          
          // Subir até 5 níveis para encontrar o container do card
          while (parent && attempts < 5) {
            // Procurar texto dentro do container
            const textElements = Array.from(parent.querySelectorAll('*'));
            const texts: string[] = [];
            
            textElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && 
                  text.length > 10 && 
                  text.length < 200 && 
                  !text.includes('Inscrições Abertas') &&
                  !text.includes('IBADE') &&
                  !text.includes('©')) {
                // Verificar se o texto não está duplicado
                if (!texts.includes(text)) {
                  texts.push(text);
                }
              }
            });
            
            // Se encontrou textos, usar os 2 primeiros (nome do edital + órgão)
            if (texts.length >= 2) {
              const name = `${texts[0]} - ${texts[1]}`;
              results.push({
                name,
                contestUrl: link.href,
              });
              break;
            }
            
            parent = parent.parentElement;
            attempts++;
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

      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Procurar link "EDITAL DE ABERTURA"
      const editalUrl = await page.evaluate(() => {
        // Procurar todos os elementos
        const allElements = Array.from(document.querySelectorAll('*'));
        
        for (const el of allElements) {
          const text = el.textContent?.toUpperCase() || '';
          
          // Verificar se contém "EDITAL" e "ABERTURA"
          if (text.includes('EDITAL') && text.includes('ABERTURA') && 
              !text.includes('ACESSÍVEL') && !text.includes('LIBRAS')) {
            
            // Procurar link PDF próximo
            const links = [
              el.querySelector('a[href*=".pdf"]'),
              el.closest('a[href*=".pdf"]'),
              el.parentElement?.querySelector('a[href*=".pdf"]'),
              el.nextElementSibling?.querySelector('a[href*=".pdf"]'),
            ];
            
            for (const link of links) {
              if (link) {
                const href = link.getAttribute('href');
                if (href && href.includes('.pdf')) {
                  return href.startsWith('http') ? href : `https://cdn-ibade.selecao.site${href}`;
                }
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
    
    if (concursos.length === 0) {
      console.log('[IBADE] Nenhum concurso encontrado');
      return [];
    }
    
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
      
      // Delay entre batches
      if (i + 3 < concursos.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}
