import { safeRunBancaBySlug, CustomFilters } from './_base.js';

const ID = 'fgv';
const BASE = process.env['B_FGV_BASE'] || 'https://conhecimento.fgv.br/concursos';
const PATTERN = new RegExp('fgv\.br|conhecimento\.fgv\.br', 'i');
const MODE = (process.env['B_FGV_MODE'] as 'static'|'headless') || 'headless'; // FGV requer headless

// Filtros customizados para FGV
const FGV_FILTERS: CustomFilters = {
  textPattern: /concurso|inscri|edital|seletivo|processo seletivo/i,
  excludeText: ['Nosso portfólio', 'Portfolio', 'Portfólio'],
  urlMustContain: '/concursos/'
};

export async function run() { 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, FGV_FILTERS); 
}
