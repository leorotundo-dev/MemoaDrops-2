import pdfParse from 'pdf-parse';

export async function pdfToText(buf: Buffer): Promise<string> {
  const data = await pdfParse(buf);
  return (data.text || '').replace(/[ \t]{2,}/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
