
import { Adapter } from '../types.js';
import { httpGet } from '../../fetcher.js';
import * as cheerio from 'cheerio';
import { pdfToText } from '../../pdf.js';
import { htmlToText } from '../../html.js';
import { splitIntoMaterias } from '../../normalize.js';

function extractPdfLinks(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  const out: string[] = [];
  $('a[href]').each((_, a) => {
    const href = String($(a).attr('href') || '').trim();
    if (!href) return;
    const url = new URL(href, base).toString();
    if (/\.pdf(\?.*)?$/i.test(url) || /edital/i.test($(a).text())) out.push(url);
  });
  return out;
}

export function makeFgvAdapter(): Adapter {
  return {
    name: 'banca-fgv',
    async fetchAndParse(url: string) {
      const r = await httpGet(url);
      const html = r.buffer.toString('utf-8');
      const pdfs = extractPdfLinks(html, r.finalUrl);
      for (const p of pdfs) {
        try {
          const rr = await httpGet(p);
          const ct = (rr.contentType || '').toLowerCase();
          if (ct.includes('pdf') || rr.finalUrl.toLowerCase().endsWith('.pdf')) {
            const text = await pdfToText(rr.buffer);
            if (text && text.length > 50) return { materias: splitIntoMaterias(text) };
          }
        } catch {}
      }
      const materias = splitIntoMaterias(htmlToText(html));
      return { materias };
    }
  };
}
