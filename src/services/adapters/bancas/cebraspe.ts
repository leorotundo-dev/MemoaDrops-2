
import { Adapter } from '../types.js';
import { httpGet } from '../../fetcher.js';
import * as cheerio from 'cheerio';
import { pdfToText } from '../../pdf.js';
import { htmlToText } from '../../html.js';
import { splitIntoMaterias } from '../../normalize.js';

function getLikelyPdfLinks(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  const hrefs = new Set<string>();
  $('a[href]').each((_, a) => {
    const h = String($(a).attr('href') || '').trim();
    if (!h) return;
    if (/edital|retifica|comunicado|manual|aviso/i.test($(a).text())) {
      hrefs.add(new URL(h, base).toString());
    }
  });
  return Array.from(hrefs);
}

export function makeCebraspeAdapter(): Adapter {
  return {
    name: 'banca-cespe',
    async fetchAndParse(url: string) {
      const r = await httpGet(url);
      const html = r.buffer.toString('utf-8');
      const links = getLikelyPdfLinks(html, r.finalUrl);
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
