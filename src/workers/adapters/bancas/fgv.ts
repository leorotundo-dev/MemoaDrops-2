import { safeRunBancaBySlug, CustomFilters } from './_base.js';

const ID = 'fgv';
const BASE = process.env['B_FGV_BASE'] || 'https://conhecimento.fgv.br/concursos';
const PATTERN = new RegExp('conhecimento\\.fgv\\.br/concursos/', 'i');
const MODE = (process.env['B_FGV_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para FGV com paginação automática
const FGV_FILTERS: CustomFilters = {
  textPattern: /concurso|processo|seletivo/i,
  excludeText: ['Nosso portfólio', 'Portfolio', 'Portfólio', 'Para candidatos', 'Em andamento', 'Realizados'],
  urlMustContain: '/concursos/',
  pagination: {
    enabled: true,
    pattern: 'query-page',  // FGV usa ?page=N
    startFrom: 0,  // Começa do 0
    maxPages: 20,  // Limite seguro
    delayMs: 1000  // 1 segundo entre páginas
  }
};

export async function run() { 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, FGV_FILTERS); 
}
