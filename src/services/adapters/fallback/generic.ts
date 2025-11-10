
import { Adapter } from '../types.js';
import { httpGet } from '../../fetcher.js';
import { htmlToText } from '../../html.js';
import { pdfToText } from '../../pdf.js';
import { splitIntoMaterias } from '../../normalize.js';

export function makeGenericAdapter(): Adapter {
  return {
    name: 'generic',
    async fetchAndParse(url: string) {
      const r = await httpGet(url);
      const ct = (r.contentType || '').toLowerCase();
      let text = '';
      if (ct.includes('pdf') || r.finalUrl.toLowerCase().endsWith('.pdf')) {
        text = await pdfToText(r.buffer);
      } else {
        text = htmlToText(r.buffer.toString('utf-8'));
      }
      const materias = splitIntoMaterias(text);
      return { materias };
    }
  };
}
