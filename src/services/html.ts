import * as cheerio from 'cheerio';

export function htmlToText(html: string): string {
  const $ = cheerio.load(html, { decodeEntities: true, xmlMode: false });
  $('script, style, noscript, iframe').remove();
  const text = $('body').text();
  return normalizeWhitespace(text);
}

export function select($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length) return el.first().html() || el.first().text() || '';
  }
  return '';
}

export function normalizeWhitespace(s: string): string {
  return (s || '').replace(/\u00A0/g, ' ').replace(/[ \t]{2,}/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
