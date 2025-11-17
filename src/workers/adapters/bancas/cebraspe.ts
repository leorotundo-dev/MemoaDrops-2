import { safeRunBancaBySlug } from './_base.js';

const ID = 'cebraspe';
const BASE = process.env['B_CEBRASPE_BASE'] || 'https://www.cebraspe.org.br/concursos/';
const PATTERN = new RegExp('cebraspe\.org\.br', 'i');
const MODE = (process.env['B_CEBRASPE_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para Cebraspe
// Site usa "MAIS INFORMAÇÕES" como texto dos links
const CUSTOM_FILTERS = {
  textPattern: /MAIS INFORMAÇÕES|concurso|inscri|edital|seletivo/i,
  extractNameFromDOM: true // Extrair nome do concurso do elemento pai
};

export async function run(){ 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, CUSTOM_FILTERS); 
}
