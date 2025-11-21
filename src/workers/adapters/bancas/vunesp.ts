import { safeRunBancaBySlug } from './_base.js';

const ID = 'vunesp';
const BASE = process.env['B_VUNESP_BASE'] || 'https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas';
const PATTERN = new RegExp('vunesp\.com\.br', 'i');
const MODE = (process.env['B_VUNESP_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para Vunesp
const CUSTOM_FILTERS = {
  extractNameFromDOM: true,  // Extrair nome do DOM ao invés do texto do link
  pagination: {
    enabled: false  // Desabilitar paginação pois a Vunesp não tem paginação funcional
  }
};

export async function run(){ 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, CUSTOM_FILTERS); 
}
