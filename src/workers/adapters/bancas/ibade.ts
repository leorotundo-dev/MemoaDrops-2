import { safeRunBancaBySlug, CustomFilters } from './_base.js';

const ID = 'ibade';
const BASE = process.env['B_IBADE_BASE'] || 'https://portal.ibade.selecao.site/edital';
const PATTERN = new RegExp('ibade\.org\.br|ibade\.selecao\.site', 'i');
const MODE = 'headless'; // IBADE requer headless (site dinâmico)

// Filtros customizados para IBADE
const IBADE_FILTERS: CustomFilters = {
  exactText: 'Inscrições Abertas',
  urlMustContain: '/edital/ver/'
};

export async function run() { 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, IBADE_FILTERS); 
}
