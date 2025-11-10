/**
 * Divide um texto em "matérias" e "conteúdos" aproximando por headings/keywords comuns.
 * Para DOU funciona bem após limpeza; para HTML genérico também funciona razoavelmente.
 */

const MATERIA_HINTS = [
  'língua portuguesa', 'matemática', 'raciocínio lógico',
  'informática', 'direito', 'atualidades', 'administração'
];

export function splitIntoMaterias(text: string): { nome: string; conteudos: string[] }[] {
  // estratégia simples: busca por linhas com palavras-chave; senão, cria 1 bloco só
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const buckets: Record<string, string[]> = {};
  let current = 'Geral';

  for (const line of lines) {
    const lower = line.toLowerCase();
    const found = MATERIA_HINTS.find(h => lower.includes(h));
    if (found) {
      current = capitalize(found);
      if (!buckets[current]) buckets[current] = [];
      continue;
    }
    if (!buckets[current]) buckets[current] = [];
    buckets[current].push(line);
  }

  const out = Object.entries(buckets).map(([nome, arr]) => ({
    nome,
    conteudos: chunk(arr.join('\n'), 500) // quebras em ~500 chars
  }));

  return out.length ? out : [{ nome: 'Geral', conteudos: chunk(text, 500) }];
}

function chunk(s: string, size: number): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    out.push(s.slice(i, i + size));
    i += size;
  }
  return out;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
