import { httpGet } from './fetcher.js';
import { htmlToText } from './html.js';
import { pdfToText } from './pdf.js';
import { AppError } from '../errors/AppError.js';
import { pickAdapter } from './adapters/index.js';

type Processed = {
  content: string;
  metadata: { source: string; title?: string; subject?: string; date?: string };
};

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url) || url.toLowerCase().endsWith('.pdf');
}

export async function processScrapedContent(url: string): Promise<Processed> {
  if (!/^https?:\/\//i.test(url)) throw new AppError('URL inválida', 400);

  // Try using adapter first
  const adapter = pickAdapter(url);
  if (adapter) {
    try {
      const result = await adapter.fetchAndParse(url);
      const content = result.materias.map((m: any) => m.conteudos.join('\n')).join('\n\n');
      if (content && content.trim().length >= 20) {
        return {
          content: cleanContent(content),
          metadata: { source: url, title: result.materias[0]?.nome }
        };
      }
    } catch (e) {
      console.warn('Adapter failed, falling back to generic fetch:', e);
    }
  }

  // Fallback to generic fetch
  const { buffer, contentType } = await httpGet(url);
  let text = '';

  if (isPdfUrl(url) || /pdf/i.test(contentType || '')) {
    text = await pdfToText(buffer);
  } else {
    text = htmlToText(buffer.toString('utf-8'));
  }

  if (!text || text.trim().length < 20) throw new AppError('Conteúdo vazio ou ilegível', 422);

  const cleaned = cleanContent(text);

  return {
    content: cleaned,
    metadata: { source: url }
  };
}

export function chunkContent(content: string, maxTokens: number = 3000): string[] {
  // heurística: ~4 chars por token
  const maxChars = Math.max(200, Math.floor(maxTokens * 4));
  const parts: string[] = [];
  for (let i = 0; i < content.length; i += maxChars) {
    parts.push(content.slice(i, i + maxChars));
  }
  return parts;
}

export function cleanContent(content: string): string {
  // remove múltiplos espaços e linhas, cabeçalhos, e normaliza quebras
  return String(content)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
