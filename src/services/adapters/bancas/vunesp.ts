
import { Adapter } from '../types.js';
import { httpGet } from '../../fetcher.js';
import * as cheerio from 'cheerio';
import { pdfToText } from '../../pdf.js';
import { htmlToText } from '../../html.js';
import { splitIntoMaterias } from '../../normalize.js';

function findEdits(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('a[href]').each((_, a) => {
    const href = String($(a).attr('href') || '').trim();
    if (!href) return;
    const txt = $(a).text().toLowerCase();
    if (/edital|retifica|manual|comunicado/.test(txt)) {
      urls.add(new URL(href, base).toString());
    }
  });
  return Array.from(urls);
}

export function makeVunespAdapter(): Adapter {
  return {
    name: 'banca-vunesp',
    async fetchAndParse(url: string) {
      const r = await httpGet(url);
      const html = r.buffer.toString('utf-8');
      const links = findEdits(html, r.finalUrl);
      for (const link of links) {
        try {
          const rr = await httpGet(link);
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
