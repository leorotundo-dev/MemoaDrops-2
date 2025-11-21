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
      'cebraspe': 'a',  // Vamos filtrar por texto no evaluate
      'cesgranrio': 'a[href*="concurso"], .concurso a, a[href*="edital"]',
      'ibfc': 'a[href*="concurso"], .card a, a[href*="edital"], a[href*="ibfc.org.br"]',
      'aocp': 'a[href*="concurso"], .concurso-item a, a[href*="edital"]',
      'vunesp': 'a',
      'idecan': 'a[href*="concurso"], .card a, a[href*="edital"], a[href*="idecan.org.br"]',
    };

    const selector = bancaSelectors[bancaName.toLowerCase()] || 'a[href*="concurso"]';

    // Extrair links de concursos
    const contests = await page.evaluate((sel, baseUrl, bancaId, bancaName) => {
      const links = Array.from(document.querySelectorAll(sel));
      const results: DiscoveredContest[] = [];

      // Blacklist de textos genéricos
      const blacklist = [
        'Inscrições abertas', 'Ir para', 'Todos os', 'Passe o mouse',
        'Concursos', 'Ver mais', 'Saiba mais', 'Clique aqui', 'Acessar',
        'Voltar', 'Próximo', 'Anterior', 'Menu', 'Home', 'Início'
      ];

      const isGeneric = (text: string) => {
        const lower = text.toLowerCase();
        return blacklist.some(pattern => lower.includes(pattern.toLowerCase()));
      };

      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';

        // Para VUNESP, filtrar apenas links "Saiba Mais" e extrair informações do card
        if (bancaName.toLowerCase() === 'vunesp') {
          const linkText = text.toLowerCase();
          if (!linkText.includes('saiba mais') && !linkText.includes('saiba mais')) {
            continue;
          }

          // Subir na hierarquia para encontrar o container do concurso
          let container = (link as HTMLElement).parentElement;
          let attempts = 0;
          while (container && attempts < 10) {
            const containerText = container.textContent || '';
            // Procurar por padrão de código de concurso (ex: PITQ2501)
            const codeMatch = containerText.match(/([A-Z]{4}\d{4})/);
            if (codeMatch) {
              const code = codeMatch[1];
              
              // Extrair texto do container
              const allText = containerText.trim();
              const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              
              // Pegar linhas que parecem ser nome de instituição ou título
              const nameLines: string[] = [];
              for (const line of lines) {
                // Pular código, estado, "CONCURSO", datas, etc
                if (line === code) continue;
                if (line === 'CONCURSO') continue;
                if (line === 'SP' || line === 'RJ' || line.length === 2) continue;
                if (isGeneric(line)) continue;
                if (/^[\d\s\/\-:]+$/.test(line)) continue;
                if (line.toLowerCase().includes('saiba mais')) continue;
                if (line.toLowerCase().includes('vagas')) continue;
                if (line.toLowerCase().includes('inscrições')) continue;
                if (line.toLowerCase().includes('faixa salarial')) continue;
                if (line.toLowerCase().includes('ensino')) continue;
                
                // Se a linha parece ser um nome válido
                if (line.length >= 10) {
                  nameLines.push(line);
                  if (nameLines.length >= 2) break; // Pegar no máximo 2 linhas
                }
              }
              
              // Montar nome do concurso
              let contestName = nameLines.join(' - ');
              
              // Se não conseguiu extrair nome, usar código como fallback
              if (!contestName || contestName.length < 10) {
                contestName = `Concurso ${code}`;
              }
              
              // Construir URL
              const contestUrl = `https://www.vunesp.com.br/${code}`;
              
              // Adicionar resultado
              results.push({
                nome: contestName.substring(0, 255),
                dou_url: contestUrl,
                banca_id: bancaId,
              });
              break;
            }
            container = container.parentElement;
            attempts++;
          }
          continue;
        }

        // Para CEBRASPE, filtrar apenas links "MAIS INFORMAÇÕES" e pegar nome do h3
        if (bancaName.toLowerCase() === 'cebraspe') {
          if (text !== 'MAIS INFORMAÇÕES') {
            continue;
          }
          
          // Pegar o nome do concurso do <h3> mais próximo
          const parent = (link as HTMLElement).closest('li, div, article');
          const h3 = parent?.querySelector('h3');
          const contestName = h3?.textContent?.trim() || text;
          
          if (href && contestName && contestName.length > 3) {
            let fullUrl = href;
            if (!href.startsWith('http')) {
              try {
                const url = new URL(href, baseUrl);
                fullUrl = url.toString();
              } catch {
                continue;
              }
            }
            
            if (fullUrl.includes('concurso')) {
              results.push({
                nome: contestName.substring(0, 255),
                dou_url: fullUrl,
                banca_id: bancaId,
              });
            }
          }
          continue;
        }

        if (href && text && text.length > 3 && !isGeneric(text)) {
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
    }, selector, contestUrl, bancaId, bancaName);

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
