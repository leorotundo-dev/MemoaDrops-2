import { safeRunBancaBySlug } from './_base.js';

const ID = 'fundatec';
const BASE = process.env['B_FUNDATEC_BASE'] || 'https://www.fundatec.org.br/portal/concursos/concursos_abertos.php';
const PATTERN = new RegExp('fundatec\.org\.br', 'i');
const MODE = (process.env['B_FUNDATEC_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para FUNDATEC
// Aceitar qualquer link que contenha palavras-chave comuns em concursos
const CUSTOM_FILTERS = {
  textPattern: /prefeitura|município|polícia|concurso|processo|seletivo|edital|universidade|instituto|federal|estadual|municipal|público/i,
  extractNameFromDOM: false, // Usar texto do próprio link
  validateUrl: (url: string) => {
    // Aceitar URLs que apontam para páginas de concursos específicos
    // Rejeitar links de navegação, menu, etc.
    const invalid = /capacitacao|escola|estagio|pesquisa|consultoria|institucional|contato|localizacao|noticia|cadastre/i;
    return !invalid.test(url);
  }
};

export async function run(){ 
  return safeRunBancaBySlug(ID, BASE, PATTERN, MODE, CUSTOM_FILTERS); 
}
