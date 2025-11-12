import puppeteer from 'puppeteer';

/**
 * Interface para um concurso descoberto
 */
interface DiscoveredContest {
  nome: string;
  dou_url: string;
  banca_id: number;
}

/**
 * Busca concursos usando Puppeteer (navegador headless)
 * Usado para bancas que bloqueiam requisições HTTP normais
 */
export async function scrapeBancaContestsWithPuppeteer(
  bancaId: number,
  bancaName: string,
  contestUrl: string
): Promise<DiscoveredContest[]> {
  let browser;
  
  try {
    console.log(`[Puppeteer Scraper] Iniciando navegador para ${bancaName}...`);
    
    // Iniciar navegador headless
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Configurar User-Agent para parecer um navegador real
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Configurar viewport
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`[Puppeteer Scraper] Navegando para ${contestUrl}...`);
    
    // Navegar para a página
    await page.goto(contestUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Aguardar um pouco para garantir que o conteúdo carregou
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`[Puppeteer Scraper] Extraindo links de concursos...`);

    // Seletores específicos por banca
    const bancaSelectors: Record<string, string> = {
      'cesgranrio': 'a[href*="concurso"], .concurso a, a[href*="edital"]',
      'ibfc': 'a[href*="concurso"], .card a, a[href*="edital"]',
      'aocp': 'a[href*="concurso"], .concurso-item a, a[href*="edital"]',
    };

    const selector = bancaSelectors[bancaName.toLowerCase()] || 'a[href*="concurso"]';

    // Extrair links de concursos
    const contests = await page.evaluate((sel, baseUrl, bancaId) => {
      const links = Array.from(document.querySelectorAll(sel));
      const results: DiscoveredContest[] = [];

      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';

        if (href && text && text.length > 10) {
          // Construir URL completa
          let fullUrl = href;
          if (!href.startsWith('http')) {
            try {
              const url = new URL(href, baseUrl);
              fullUrl = url.toString();
            } catch {
              continue;
            }
          }

          // Verificar se parece ser um link de concurso/edital
          if (
            fullUrl.includes('concurso') ||
            fullUrl.includes('edital') ||
            fullUrl.includes('.pdf')
          ) {
            results.push({
              nome: text.substring(0, 255),
              dou_url: fullUrl,
              banca_id: bancaId,
            });
          }
        }
      }

      return results;
    }, selector, contestUrl, bancaId);

    console.log(`[Puppeteer Scraper] Encontrados ${contests.length} concursos para ${bancaName}`);
    
    return contests;

  } catch (error) {
    console.error(`[Puppeteer Scraper] Erro ao buscar concursos de ${bancaName}:`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[Puppeteer Scraper] Navegador fechado`);
    }
  }
}
