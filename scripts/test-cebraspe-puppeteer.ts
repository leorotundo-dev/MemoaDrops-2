import puppeteer from 'puppeteer';

/**
 * Teste específico para CEBRASPE usando Puppeteer
 */
async function testCebraspePuppeteer() {
  let browser;
  
  try {
    console.log('🚀 Iniciando teste do scraper CEBRASPE com Puppeteer...\n');
    
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
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    const url = 'https://www.cebraspe.org.br/concursos';
    console.log(`📍 Navegando para: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    console.log('⏳ Aguardando 5 segundos para garantir renderização...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Testar múltiplos seletores
    const selectors = [
      'a[href*="/concursos/"]',
      'a:has-text("MAIS INFORMAÇÕES")',
      '.card a',
      'button:has-text("MAIS INFORMAÇÕES")',
      'a.icon_with_title_link',
      '.q_circle_text_holder a',
    ];

    console.log('🔍 Testando seletores:\n');

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`   ${selector}`);
        console.log(`   → Encontrados: ${elements.length} elementos`);
        
        if (elements.length > 0) {
          // Extrair alguns exemplos
          const samples = await page.evaluate((sel) => {
            const links = Array.from(document.querySelectorAll(sel));
            return links.slice(0, 3).map(link => ({
              href: (link as HTMLAnchorElement).href || link.getAttribute('href'),
              text: link.textContent?.trim().substring(0, 50),
            }));
          }, selector);
          
          console.log('   📄 Exemplos:');
          samples.forEach(s => console.log(`      - ${s.text}: ${s.href}`));
        }
        console.log('');
      } catch (error: any) {
        console.log(`   ❌ Erro ao testar seletor: ${error.message}\n`);
      }
    }

    // Tentar extrair todo o HTML da página para análise
    console.log('📝 Salvando HTML da página para análise...');
    const html = await page.content();
    const fs = await import('fs');
    fs.writeFileSync('/tmp/cebraspe-page.html', html);
    console.log('   → Salvo em: /tmp/cebraspe-page.html\n');

    // Tirar screenshot
    console.log('📸 Tirando screenshot...');
    await page.screenshot({ path: '/tmp/cebraspe-screenshot.png', fullPage: true });
    console.log('   → Salvo em: /tmp/cebraspe-screenshot.png\n');

    console.log('✅ Teste concluído!');

  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testCebraspePuppeteer().catch(console.error);
