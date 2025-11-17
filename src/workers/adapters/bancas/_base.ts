import * as cheerio from 'cheerio';
import { upsertContest, logUpdate, sha256, enqueueReview } from './_utils.js';
import { getIfChanged } from '../../utils/http_conditional.js';
import { headlessFetch } from '../../utils/headless.js';
import { detectBlock } from '../../utils/captcha.js';

export interface CustomFilters {
  textPattern?: RegExp;
  exactText?: string;
  excludeText?: string[];
  urlMustContain?: string;
  extractNameFromDOM?: boolean;
}

const UA = process.env.HARVEST_USER_AGENT || 'MemoDropsHarvester/1.0 (+contato)';

function makeAbs(base:string, href:string){ try{ return new URL(href, base).href; }catch{ return href; } }

async function fetchHtml(url:string, renderMode:'static'|'headless'){
  if (renderMode === 'headless'){
    const { html, blocked } = await headlessFetch(url, UA, 6000);
    if (blocked) throw new Error('blocked/captcha');
    return { html, etag: undefined, lastModified: undefined };
  }
  const r = await getIfChanged(url, UA, undefined);
  if (r.status === 304) return { html: '', etag: r.etag, lastModified: r.lastModified };
  if (r.status && r.status >= 400) throw new Error(`HTTP ${r.status}`);
  const prob = detectBlock(r.html || '');
  if (prob) throw new Error(prob);
  return { html: r.html, etag: r.etag, lastModified: r.lastModified };
}

export async function runBanca(bancaId:number, base:string, domainPattern:RegExp, renderMode:'static'|'headless', customFilters?:CustomFilters){
  // 1) baixa listagem
  const { html } = await fetchHtml(base, renderMode);
  const $ = cheerio.load(html);
  const items: Array<{title:string; url:string}> = [];

  $('a').each((_,a)=>{
    const href = $(a).attr('href')||'';
    const text = $(a).text().trim();
    if (!href || !text) return;
    
    // Aplicar filtros customizados se fornecidos
    if (customFilters) {
      // Filtro de texto exato
      if (customFilters.exactText && text !== customFilters.exactText) return;
      
      // Filtro de padrão de texto
      if (customFilters.textPattern && !customFilters.textPattern.test(text)) return;
      
      // Filtro de exclusão de texto
      if (customFilters.excludeText) {
        const shouldExclude = customFilters.excludeText.some(excluded => text.includes(excluded));
        if (shouldExclude) return;
      }
    } else {
      // Filtro padrão se não houver filtros customizados
      if (!/concurso|inscri|edital|seletivo/i.test(text)) return;
    }
    
    const url = makeAbs(base, href);
    if (!domainPattern.test(url)) return;
    
    // Validar URL se filtro customizado especificar
    if (customFilters?.urlMustContain && !url.includes(customFilters.urlMustContain)) return;
    
    // Extrair nome do DOM se solicitado (para sites que usam texto genérico nos links)
    let title = text;
    if (customFilters?.extractNameFromDOM) {
      // Buscar título em elementos próximos (h1-h6, strong, etc)
      const parent = $(a).parent();
      const heading = parent.find('h1, h2, h3, h4, h5, h6').first().text().trim();
      if (heading && heading !== text) {
        title = heading;
      } else {
        // Tentar buscar no elemento pai direto
        const parentText = parent.clone().children().remove().end().text().trim();
        if (parentText && parentText !== text) {
          title = parentText;
        }
      }
    }
    
    items.push({ title, url });
  });

  // 2) persiste
  let count = 0;
  for (const it of items){
    const external_id = sha256(it.url).slice(0,16);
    await upsertContest(bancaId, external_id, {
      title: it.title, url: it.url, status: null, raw: { source: bancaId }
    });
    await logUpdate(bancaId, external_id, it.title, it.url);
    count++;
  }
  return { bancaId, found: count };
}

export async function safeRunBanca(bancaId:number, base:string, pattern:RegExp, mode:'static'|'headless', customFilters?:CustomFilters){
  try{
    return await runBanca(bancaId, base, pattern, mode, customFilters);
  }catch(e:any){
    const reason = String(e?.message||e);
    await enqueueReview(bancaId, base, reason);
    return { bancaId, error: reason };
  }
}

/**
 * Wrapper que aceita slug e busca ID numérico
 */
export async function safeRunBancaBySlug(slug:string, base:string, pattern:RegExp, mode:'static'|'headless', customFilters?:CustomFilters){
  const { getBancaId } = await import('./_utils.js');
  const bancaId = await getBancaId(slug);
  return safeRunBanca(bancaId, base, pattern, mode, customFilters);
}
