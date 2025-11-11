import { pickAdapter } from './adapters/index.js';

export async function scrapeContest(url: string): Promise<{ materias: Array<{ nome: string; conteudos: string[] }> }> {
  const adapter = pickAdapter(url);
  if (!adapter || typeof adapter.fetchAndParse !== 'function') {
    throw new Error('Adapter não encontrado/indisponível para a URL fornecida');
  }
  const data = await adapter.fetchAndParse(url);
  if (!data || !Array.isArray(data.materias)) {
    return { materias: [] };
  }
  return data;
}
