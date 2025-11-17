import { upsertContest, logUpdate, sha256 } from './_utils.js';
import { headlessFetch } from '../../utils/headless.js';
import * as cheerio from 'cheerio';

const ID = 'fgv';
const BASE = process.env['B_FGV_BASE'] || 'https://conhecimento.fgv.br/concursos';
const PATTERN = new RegExp('conhecimento\\.fgv\\.br/concursos/', 'i');
const MODE = (process.env['B_FGV_MODE'] as 'static'|'headless') || 'headless';

// Filtros customizados para FGV
const CUSTOM_FILTERS = {
  textPattern: /concurso|processo|seletivo/i,
  excludeText: ['Nosso portfólio', 'Portfolio', 'Portfólio', 'Para candidatos', 'Em andamento', 'Realizados'],
  urlMustContain: '/concursos/'
};

const BANCA_ID = 58; // ID da FGV no banco

// Scraper customizado com paginação
export async function run(){ 
  try {
    const items: Array<{title:string; url:string}> = [];
    
    // Buscar todas as páginas (FGV tem paginação)
    for (let page = 0; page < 10; page++) {
      const pageUrl = page === 0 ? BASE : `${BASE}?page=${page}`;
      console.log(`[FGV] Buscando página ${page + 1}: ${pageUrl}`);
      
      const { html, blocked } = await headlessFetch(pageUrl, 'MemoDropsHarvester/1.0', 6000);
      if (blocked) {
        console.log(`[FGV] Página ${page + 1} bloqueada, parando`);
        break;
      }
      
      const $ = cheerio.load(html);
      let foundInPage = 0;
      
      $('a').each((_,a)=>{
        const href = $(a).attr('href')||'';
        const text = $(a).text().trim();
        if (!href || !text) return;
        
        // Aplicar filtros
        if (!CUSTOM_FILTERS.textPattern.test(text)) return;
        
        const shouldExclude = CUSTOM_FILTERS.excludeText.some(excluded => text.includes(excluded));
        if (shouldExclude) return;
        
        const url = new URL(href, BASE).href;
        if (!PATTERN.test(url)) return;
        if (!url.includes(CUSTOM_FILTERS.urlMustContain)) return;
        
        // Evitar duplicatas
        if (items.some(it => it.url === url)) return;
        
        items.push({ title: text, url });
        foundInPage++;
      });
      
      console.log(`[FGV] Página ${page + 1}: ${foundInPage} concursos encontrados`);
      
      // Se não encontrou nada, provavelmente chegou ao fim
      if (foundInPage === 0) break;
      
      // Delay entre páginas para evitar bloqueio
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[FGV] Total de concursos únicos encontrados: ${items.length}`);
    
    // Persistir todos os concursos
    let count = 0;
    for (const it of items){
      const external_id = sha256(it.url).slice(0,16);
      await upsertContest(BANCA_ID, external_id, {
        title: it.title, url: it.url, status: null, raw: { source: BANCA_ID }
      });
      await logUpdate(BANCA_ID, external_id, it.title, it.url);
      count++;
    }
    
    return { bancaId: BANCA_ID, found: count };
  } catch (err) {
    console.error('[FGV] Erro:', err);
    throw err;
  }
}
