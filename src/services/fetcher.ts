import { setTimeout as delay } from 'node:timers/promises';
import fetch from 'node-fetch';

export type FetchResult = { url: string; contentType: string; buffer: Buffer; finalUrl: string };

const UA = process.env.SCRAPER_USER_AGENT || 'MemoDropsBot/1.0';
const MAX_BYTES = Number(process.env.SCRAPER_MAX_BYTES || 5 * 1024 * 1024); // 5MB
const TIMEOUT = Number(process.env.SCRAPER_TIMEOUT_MS || 20_000);
const USE_PW = String(process.env.SCRAPER_USE_PLAYWRIGHT || 'true').toLowerCase() === 'true';
const REQ_DELAY = Number(process.env.SCRAPER_DELAY_MS || 800);

export async function httpGet(url: string): Promise<FetchResult> {
  if (USE_PW) {
    try {
      const r = await playwrightGet(url);
      await delay(REQ_DELAY);
      return r;
    } catch (e) {
      console.warn('[fetcher] Playwright falhou, caindo para fetch:', (e as Error)?.message);
    }
  }
  const r = await basicGet(url);
  await delay(REQ_DELAY);
  return r;
}

async function basicGet(url: string): Promise<FetchResult> {
  const ctr = new AbortController();
  const to = setTimeout(() => ctr.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctr.signal, headers: { 'User-Agent': UA, 'Accept': '*/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    const arr = new Uint8Array(await res.arrayBuffer());
    if (arr.byteLength > MAX_BYTES) throw new Error(`conteúdo maior que limite ${MAX_BYTES} bytes`);
    return { url, contentType: ct, buffer: Buffer.from(arr), finalUrl: res.url };
  } finally {
    clearTimeout(to);
  }
}

async function playwrightGet(url: string): Promise<FetchResult> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: UA, javaScriptEnabled: true });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  const contentType = await page.evaluate(() => document.contentType || 'text/html').catch(()=> 'text/html');
  let buf: Buffer;
  if (contentType.includes('pdf')) {
    const pdfBuffer = await page.evaluate(async () => {
      const r = await fetch(window.location.href);
      const a = await r.arrayBuffer();
      return Array.from(new Uint8Array(a));
    });
    buf = Buffer.from(Uint8Array.from(pdfBuffer));
  } else {
    const html = await page.content();
    buf = Buffer.from(html, 'utf-8');
  }
  const finalUrl = page.url();
  await ctx.close();
  await browser.close();
  if (buf.byteLength > MAX_BYTES) throw new Error(`conteúdo maior que limite ${MAX_BYTES} bytes`);
  return { url, contentType, buffer: buf, finalUrl };
}
