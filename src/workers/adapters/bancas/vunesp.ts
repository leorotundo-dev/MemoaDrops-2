import { safeRunBancaBySlug } from './_base.js';

const ID = 'vunesp';
const PATTERN = new RegExp('vunesp\.com\.br', 'i');
const MODE = (process.env['B_VUNESP_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para Vunesp
const CUSTOM_FILTERS = {
  extractNameFromDOM: true,  // Extrair nome do DOM ao invés do texto do link
  pagination: {
    enabled: false  // Desabilitar paginação pois a Vunesp não tem paginação funcional
  }
};

// URLs para buscar concursos da Vunesp
const VUNESP_URLS = [
  'https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas',
  'https://www.vunesp.com.br/busca/concurso/proximo',
  'https://www.vunesp.com.br/busca/concurso/em%20andamento',
];

export async function run(){ 
  console.log(`[Vunesp] Buscando em ${VUNESP_URLS.length} URLs`);
  
  const allContests: any[] = [];
  
  for (const url of VUNESP_URLS) {
    console.log(`[Vunesp] Processando: ${url}`);
    const contests = await safeRunBancaBySlug(ID, url, PATTERN, MODE, CUSTOM_FILTERS);
    allContests.push(...contests);
  }
  
  // Remover duplicatas baseado na URL
  const uniqueContests = Array.from(
    new Map(allContests.map((c: any) => [c.url, c])).values()
  );
  
  console.log(`[Vunesp] Total: ${allContests.length} concursos, ${uniqueContests.length} únicos`);
  
  return uniqueContests;
}
