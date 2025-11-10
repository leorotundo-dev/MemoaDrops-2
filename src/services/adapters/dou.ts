import { Adapter } from './types.js';
import { httpGet } from '../fetcher.js';
import { htmlToText } from '../html.js';
import { pdfToText } from '../pdf.js';
import { splitIntoMaterias } from '../normalize.js';

/**
 * Adapter DOU (in.gov.br)
 * - Detecta HTML ou PDF
 * - Limpa, normaliza e cria buckets de matérias
 * - Fallback "genérico" quando flagged
 */
export function makeDouAdapter(genericFallback = false): Adapter {
  return {
    name: genericFallback ? 'generic' : 'dou',
    async fetchAndParse(url: string) {
      const r = await httpGet(url);
      const ct = (r.contentType || '').toLowerCase();
      let text = '';

      if (ct.includes('pdf') || r.finalUrl.toLowerCase().endsWith('.pdf')) {
        text = await pdfToText(r.buffer);
      } else {
        const html = r.buffer.toString('utf-8');
        text = htmlToText(html);
      }

      if (!text || text.length < 50) {
        throw new Error('conteúdo insuficiente para parsing');
      }

      const materias = splitIntoMaterias(text);
      return { materias };
    }
  };
}
