import { pickAdapter } from './adapters/index.js';

/**
 * Busca mock para auto-complete/explorar (mantida)
 */
export async function searchConcursosMock(q: string) {
  return [
    { id: 'https://www.in.gov.br/edital/123', titulo: `Edital ${q} 123 (DOU)`, douUrl: 'https://www.in.gov.br/edital/123' },
    { id: 'https://www.in.gov.br/edital/456', titulo: `Edital ${q} 456 (DOU)`, douUrl: 'https://www.in.gov.br/edital/456' }
  ];
}

/**
 * Scraper real usando adapters por domínio (DOU implementado).
 * Retorna { materias: [{ nome, conteudos: string[] }] }.
 */
export async function scrapeContest(douUrl: string) {
  const adapter = pickAdapter(douUrl);
  const out = await adapter.fetchAndParse(douUrl);
  return out;
}
