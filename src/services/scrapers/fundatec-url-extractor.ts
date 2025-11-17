import puppeteer from 'puppeteer';

export class FundatecUrlExtractor {
  async extractEditalUrl(contestUrl: string): Promise<string | null> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.goto(contestUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Procurar link "EDITAL DE ABERTURA"
      const editalUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const editalLink = links.find(link => {
          const text = (link.textContent || '').toUpperCase();
          return text.includes('EDITAL') && text.includes('ABERTURA');
        });
        return editalLink?.href || null;
      });

      return editalUrl;
    } catch (error) {
      console.error(`Erro ao extrair URL da FUNDATEC: ${error}`);
      return null;
    } finally {
      await browser.close();
    }
  }

  async populateAll(concursos: any[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const concurso of concursos) {
      try {
        const editalUrl = await this.extractEditalUrl(concurso.contest_url);
        if (editalUrl) {
          success++;
          console.log(`✅ ${concurso.name}: ${editalUrl}`);
        } else {
          failed++;
          console.log(`❌ ${concurso.name}: Não encontrado`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ ${concurso.name}: ${error}`);
      }
    }

    return { success, failed };
  }
}
