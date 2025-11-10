import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromBuffer(buf: Buffer, mime?: string, name?: string): Promise<string> {
  const ext = (name || '').toLowerCase().split('.').pop() || '';
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf') || ext === 'pdf') {
    const out = await pdfParse(buf);
    return (out.text || '').trim();
  }
  if (m.includes('word') || m.includes('officedocument') || ext === 'docx') {
    const out = await mammoth.extractRawText({ buffer: buf });
    return (out.value || '').trim();
  }
  // Fallback: tentar como texto
  return buf.toString('utf-8');
}
