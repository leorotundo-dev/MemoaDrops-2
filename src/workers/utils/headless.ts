import { chromium, Browser } from 'playwright';
import { bumpDomainCounter } from './metrics.js';

let browser: Browser | null = null;
export async function headlessFetch(url: string, ua: string, timeoutMs=6000){
  if (!browser) browser = await chromium.launch({ 
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ]
  });
  
  const page = await browser.newPage({ 
    userAgent: ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
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
    }
  });
  
  // Remover propriedades que indicam automação
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
  });
  
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
  
  // Simular comportamento humano
  await page.waitForTimeout(Math.random() * 1000 + 500); // 500-1500ms
  
  const status = res?.status() || 0;
  const html = await page.content();
  const host = new URL(url).host;
  if (status >= 500) await bumpDomainCounter(host, '5xx');
  else if (status >= 400) await bumpDomainCounter(host, '4xx');
  else await bumpDomainCounter(host, 'ok');
  const blocked = /captcha|cf-chl|hcaptcha|turnstile|access denied|forbidden/i.test(html);
  if (blocked) await bumpDomainCounter(host, 'blocked');
  return { html, blocked, status };
}

export async function closeHeadless(){ try{ await browser?.close(); }catch{} finally{ browser=null; } }
