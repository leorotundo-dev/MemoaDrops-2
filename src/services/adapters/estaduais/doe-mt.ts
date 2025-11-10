
import { Adapter } from '../types.js';
import { httpGet } from '../../fetcher.js';
import { htmlToText } from '../../html.js';
import { pdfToText } from '../../pdf.js';
import { splitIntoMaterias } from '../../normalize.js';

export function makeDoeMtAdapter(): Adapter {
  return {
    name: 'doe-mt',
    async fetchAndParse(url: string) {
      const r = await httpGet(url);
      const ct = (r.contentType || '').toLowerCase();
      let text = '';
      if (ct.includes('pdf') || r.finalUrl.toLowerCase().endsWith('.pdf')) {
        text = await pdfToText(r.buffer);
      } else {
        text = htmlToText(r.buffer.toString('utf-8'));
      }
      if (!text || text.length < 50) throw new Error('conteúdo insuficiente (doe-mt)');
      return { materias: splitIntoMaterias(text) };
    }
  };
}
