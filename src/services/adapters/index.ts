import type { Adapter } from './types.js';
import { makeDouAdapter } from './dou.js';

export type ScrapeResult = { materias: { nome: string; conteudos: string[] }[] };

export function pickAdapter(url: string): Adapter {
  const u = new URL(url);
  if (u.hostname.endsWith('in.gov.br')) return makeDouAdapter();
  // futuros: doe.sp.gov.br, diários municipais, etc.
  return makeDouAdapter(true); // fallback genérico reusando heurísticas do DOU
}
