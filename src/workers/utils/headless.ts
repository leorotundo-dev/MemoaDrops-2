import { chromium, Browser } from 'playwright';
import { bumpDomainCounter } from './metrics.js';

let browser: Browser | null = null;
export async function headlessFetch(url: string, ua: string, timeoutMs=6000){
  if (!browser) browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: ua, locale: 'pt-BR' });
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
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
