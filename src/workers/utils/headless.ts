import { chromium as playwrightChromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'playwright';
import { bumpDomainCounter } from './metrics.js';

// Adicionar plugin stealth
playwrightChromium.use(stealth());

let browser: Browser | null = null;

export async function headlessFetch(url: string, ua: string, timeoutMs=6000){
  if (!browser) {
    browser = await playwrightChromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    });
  }
  
  const context = await browser.newContext({
    userAgent: ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    // Simular permissões de um navegador real
    permissions: ['geolocation'],
    geolocation: { latitude: -23.5505, longitude: -46.6333 }, // São Paulo
    timezoneId: 'America/Sao_Paulo',
  });
  
  const page = await context.newPage();
  
  // Scripts adicionais para evasão
  await page.addInitScript(() => {
    // Remover webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Simular plugins reais
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ];
      },
    });
    
    // Simular languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });
    
    // Simular hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });
    
    // Simular deviceMemory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });
    
    // Modificar chrome object
    (window as any).chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
      app: {},
    };
    
    // Modificar permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) => {
      return parameters.name === 'notifications'
        ? Promise.resolve({ state: 'denied' } as PermissionStatus)
        : originalQuery(parameters);
    };
  });
  
  try {
    const res = await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: timeoutMs 
    });
    
    // Simular comportamento humano - movimentos do mouse
    await page.mouse.move(100, 100);
    await page.waitForTimeout(Math.random() * 300 + 200);
    await page.mouse.move(200, 200);
    await page.waitForTimeout(Math.random() * 300 + 200);
    
    // Scroll suave
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 100 + 50);
    });
    
    // Aguardar um pouco mais
    await page.waitForTimeout(Math.random() * 1000 + 500);
    
    const status = res?.status() || 0;
    const html = await page.content();
    const host = new URL(url).host;
    
    if (status >= 500) await bumpDomainCounter(host, '5xx');
    else if (status >= 400) await bumpDomainCounter(host, '4xx');
    else await bumpDomainCounter(host, 'ok');
    
    const blocked = /captcha|cf-chl|hcaptcha|turnstile|access denied|forbidden/i.test(html);
    if (blocked) {
      console.log(`[Headless] ⚠️ Bloqueio detectado em ${url}`);
      await bumpDomainCounter(host, 'blocked');
    } else {
      console.log(`[Headless] ✅ Acesso bem-sucedido a ${url}`);
    }
    
    await context.close();
    return { html, blocked, status };
    
  } catch (error) {
    console.error(`[Headless] ❌ Erro ao acessar ${url}:`, error);
    await context.close();
    throw error;
  }
}

export async function closeHeadless(){ 
  try{ 
    await browser?.close(); 
  } catch(e) {
    console.error('[Headless] Erro ao fechar navegador:', e);
  } finally{ 
    browser = null; 
  } 
}
