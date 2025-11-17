import { safeRunBancaBySlug } from './_base.js';

const ID = 'fundatec';
const BASE = process.env['B_FUNDATEC_BASE'] || 'https://www.fundatec.org.br/portal/concursos/concursos_abertos.php';
const PATTERN = new RegExp('fundatec\.org\.br', 'i');
const MODE = (process.env['B_FUNDATEC_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para FUNDATEC
// Site é SPA que carrega conteúdo via JavaScript
const CUSTOM_FILTERS = {
  textPattern: /concurso|inscri|edital|seletivo|mais informações/i,
  extractNameFromDOM: true // Extrair nome do concurso do elemento pai
};

export async function run(){ 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, CUSTOM_FILTERS); 
}
