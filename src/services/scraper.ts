/**
 * Mock simples de scraping para demonstração.
 * A partir de uma douUrl, gera matérias e conteúdos estáticos.
 */
export async function searchConcursosMock(q: string) {
  return [
    { id: 'https://www.in.gov.br/edital/123', titulo: `Edital ${q} 123`, douUrl: 'https://www.in.gov.br/edital/123' },
    { id: 'https://www.in.gov.br/edital/456', titulo: `Edital ${q} 456`, douUrl: 'https://www.in.gov.br/edital/456' }
  ];
}

export async function scrapeContestMock(douUrl: string) {
  // Gera 3 matérias com 3 conteúdos cada
  const seed = douUrl.length % 100;
  const materias = Array.from({ length: 3 }).map((_, i) => ({
    nome: `Matéria ${i+1}`,
    conteudos: Array.from({ length: 3 }).map((__, j) => `Conteúdo ${i+1}.${j+1} — tópico gerado para seed ${seed}`)
  }));
  return { materias };
}
