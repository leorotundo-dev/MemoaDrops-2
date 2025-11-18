import puppeteer from 'puppeteer';

async function testPuppeteer() {
  console.log('🔍 Testando Puppeteer...');
  
  try {
    console.log('Iniciando browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Abrindo página...');
    const page = await browser.newPage();
    
    console.log('Navegando para Cebraspe...');
    await page.goto('https://www.cebraspe.org.br/concursos/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('Aguardando conteúdo carregar...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Extraindo HTML...');
    const html = await page.content();
    
    console.log(`✅ HTML obtido: ${html.length} caracteres`);
    console.log(`Contém "concurso": ${html.toLowerCase().includes('concurso')}`);
    
    // Procurar links de concursos
    const links = await page.$$eval('a[href*="concurso"]', (elements) => 
      elements.slice(0, 10).map(el => ({
        text: el.textContent?.trim(),
        href: el.getAttribute('href')
      }))
    );
    
    console.log(`\n📋 Links encontrados: ${links.length}`);
    links.forEach((link, i) => {
      console.log(`${i + 1}. ${link.text}`);
      console.log(`   ${link.href}\n`);
    });
    
    await browser.close();
    console.log('✅ Teste concluído!');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

testPuppeteer();
