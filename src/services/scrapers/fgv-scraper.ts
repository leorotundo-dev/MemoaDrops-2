import puppeteer, { Browser, Page } from 'puppeteer';

export interface FgvConcurso {
  name: string;
  url: string;
  editalUrl?: string;
}

export class FgvScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapeListaConcursos(): Promise<FgvConcurso[]> {
    if (!this.page) throw new Error('Scraper not initialized');

    const concursos: FgvConcurso[] = [];

    try {
      // Acessar página de concursos
      await this.page.goto('https://conhecimento.fgv.br/concursos', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Aguardar carregamento
      await this.page.waitForTimeout(3000);

      // Clicar na aba "Em andamento"
      try {
        await this.page.click('a:has-text("Em andamento")');
        await this.page.waitForTimeout(2000);
      } catch (e) {
        console.log('Aba "Em andamento" já selecionada ou não encontrada');
      }

      // Extrair concursos de todas as páginas
      let hasNextPage = true;
      let pageNum = 1;

      while (hasNextPage && pageNum <= 5) {
        console.log(`Processando página ${pageNum}...`);

        // Extrair concursos da página atual
        const concursosPage = await this.page.evaluate(() => {
          const results: { name: string; url: string }[] = [];
          
          // Buscar todos os cards de concursos
          const cards = document.querySelectorAll('div.views-row');
          
          cards.forEach(card => {
            const link = card.querySelector('a');
            if (link) {
              const name = link.textContent?.trim() || '';
              const url = link.getAttribute('href') || '';
              
              // Filtrar "Nosso portfólio" e outros links irrelevantes
              if (name && url && 
                  !name.includes('Nosso portfólio') && 
                  !name.includes('Em andamento') &&
                  !name.includes('Realizados') &&
                  name.length > 10) {
                results.push({
                  name,
                  url: url.startsWith('http') ? url : `https://conhecimento.fgv.br${url}`
                });
              }
            }
          });
          
          return results;
        });

        concursos.push(...concursosPage);
        console.log(`Encontrados ${concursosPage.length} concursos na página ${pageNum}`);

        // Verificar se há próxima página
        const nextButton = await this.page.$('a:has-text("Próxima página")');
        if (nextButton) {
          await nextButton.click();
          await this.page.waitForTimeout(3000);
          pageNum++;
        } else {
          hasNextPage = false;
        }
      }

      console.log(`Total de concursos encontrados: ${concursos.length}`);
      return concursos;

    } catch (error) {
      console.error('Erro ao scrape lista de concursos FGV:', error);
      throw error;
    }
  }

  async extrairEditalUrl(concursoUrl: string): Promise<string | null> {
    if (!this.page) throw new Error('Scraper not initialized');

    try {
      console.log(`Acessando ${concursoUrl}...`);
      
      await this.page.goto(concursoUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await this.page.waitForTimeout(2000);

      // Buscar link com "EDITAL DE ABERTURA" ou "Edital de Abertura"
      const editalUrl = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        
        // Procurar por "EDITAL DE ABERTURA" ou "Edital de Abertura"
        const editalLink = links.find(link => {
          const text = link.textContent?.toUpperCase() || '';
          return text.includes('EDITAL') && 
                 text.includes('ABERTURA') && 
                 !text.includes('RETIFICAÇÃO') &&
                 !text.includes('RETIFICACAO');
        });

        if (editalLink) {
          const href = editalLink.getAttribute('href');
          if (href) {
            return href.startsWith('http') ? href : `https://conhecimento.fgv.br${href}`;
          }
        }

        return null;
      });

      if (editalUrl) {
        console.log(`Edital encontrado: ${editalUrl}`);
        
        // Se a URL não for um PDF direto, tentar acessar e pegar o PDF
        if (!editalUrl.endsWith('.pdf')) {
          await this.page.goto(editalUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
          });
          
          await this.page.waitForTimeout(1000);
          
          // Verificar se redirecionou para PDF
          const finalUrl = this.page.url();
          if (finalUrl.endsWith('.pdf')) {
            return finalUrl;
          }
        }
        
        return editalUrl;
      }

      console.log('Edital de abertura não encontrado');
      return null;

    } catch (error) {
      console.error(`Erro ao extrair edital de ${concursoUrl}:`, error);
      return null;
    }
  }

  async scrapeComEditais(): Promise<FgvConcurso[]> {
    await this.init();

    try {
      const concursos = await this.scrapeListaConcursos();
      
      // Extrair URLs de editais (processar apenas os primeiros 10 para teste)
      const concursosComEditais: FgvConcurso[] = [];
      
      for (let i = 0; i < Math.min(concursos.length, 10); i++) {
        const concurso = concursos[i];
        console.log(`\nProcessando ${i + 1}/${Math.min(concursos.length, 10)}: ${concurso.name}`);
        
        const editalUrl = await this.extrairEditalUrl(concurso.url);
        
        concursosComEditais.push({
          ...concurso,
          editalUrl: editalUrl || undefined
        });
        
        // Delay entre requisições
        await this.page!.waitForTimeout(2000);
      }

      return concursosComEditais;

    } finally {
      await this.close();
    }
  }
}
