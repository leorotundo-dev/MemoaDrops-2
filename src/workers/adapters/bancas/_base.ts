import * as cheerio from 'cheerio';
import { upsertContest, logUpdate, sha256, enqueueReview } from './_utils.js';
import { getIfChanged } from '../../utils/http_conditional.js';
import { headlessFetch } from '../../utils/headless.js';
import { detectBlock } from '../../utils/captcha.js';

export interface PaginationConfig {
  enabled?: boolean;  // default: true
  pattern?: 'query-page' | 'query-p' | 'path' | 'offset' | 'auto';  // default: 'auto'
  startFrom?: number;  // default: 0
  maxPages?: number;  // default: 20
  itemsPerPage?: number;  // para offset, default: 20
  delayMs?: number;  // delay entre páginas, default: 1000
}

export interface CustomFilters {
  textPattern?: RegExp;
  exactText?: string;
  excludeText?: string[];
  urlMustContain?: string;
  extractNameFromDOM?: boolean;
  pagination?: PaginationConfig;
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
  return { html: r.html || '', etag: r.etag, lastModified: r.lastModified };
}

function buildPageUrl(base: string, pageNum: number, pattern: string, startFrom: number, itemsPerPage: number): string {
  const actualPage = startFrom + pageNum;
  
  switch (pattern) {
    case 'query-page':
      return pageNum === 0 ? base : `${base}${base.includes('?') ? '&' : '?'}page=${actualPage}`;
    case 'query-p':
      return pageNum === 0 ? base : `${base}${base.includes('?') ? '&' : '?'}p=${actualPage}`;
    case 'path':
      return pageNum === 0 ? base : `${base.replace(/\/$/, '')}/pagina/${actualPage}`;
    case 'offset':
      const offset = pageNum * itemsPerPage;
      return pageNum === 0 ? base : `${base}${base.includes('?') ? '&' : '?'}offset=${offset}&limit=${itemsPerPage}`;
    default:
      return base;
  }
}

async function tryPatterns(base: string, pageNum: number, renderMode: 'static'|'headless', startFrom: number, itemsPerPage: number): Promise<{html: string, pattern: string} | null> {
  const patterns = ['query-page', 'query-p', 'path', 'offset'] as const;
  
  for (const pattern of patterns) {
    try {
      const url = buildPageUrl(base, pageNum, pattern, startFrom, itemsPerPage);
      const { html } = await fetchHtml(url, renderMode);
      
      // Verificar se retornou HTML válido
      if (html && html.length > 100) {
        console.log(`[Pagination] Pattern '${pattern}' funcionou para ${base}`);
        return { html, pattern };
      }
    } catch (e) {
      // Tentar próximo padrão
      continue;
    }
  }
  
  return null;
}

function extractItems($: cheerio.CheerioAPI, base: string, domainPattern: RegExp, customFilters?: CustomFilters): Array<{title:string; url:string}> {
  const items: Array<{title:string; url:string}> = [];
  
  // Blacklist de textos genéricos que não são nomes de concursos
  const GENERIC_TEXTS = [
    /^inscri[çc][õo]es abertas?$/i,
    /^ir para/i,
    /^todos os/i,
    /^passe o mouse/i,
    /^concursos?$/i,
    /^ver mais/i,
    /^saiba mais/i,
    /^clique aqui/i,
    /^acessar/i,
    /^voltar/i,
    /^pr[óo]ximo/i,
    /^anterior/i,
    /^menu/i,
    /^home$/i,
    /^in[íi]cio$/i
  ];
  
  $('a').each((_,a)=>{
    const href = $(a).attr('href')||'';
    const text = $(a).text().trim();
    if (!href || !text) return;
    
    // Excluir textos genéricos
    if (GENERIC_TEXTS.some(pattern => pattern.test(text))) return;
    
    // Excluir textos muito curtos (provavelmente botões)
    if (text.length < 10) return;
    
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
  
  return items;
}

export async function runBanca(bancaId:number, base:string, domainPattern:RegExp, renderMode:'static'|'headless', customFilters?:CustomFilters){
  // Configuração de paginação
  const paginationEnabled = customFilters?.pagination?.enabled !== false;  // default: true
  const paginationPattern = customFilters?.pagination?.pattern || 'auto';
  const startFrom = customFilters?.pagination?.startFrom ?? 0;
  const maxPages = customFilters?.pagination?.maxPages ?? 20;
  const itemsPerPage = customFilters?.pagination?.itemsPerPage ?? 20;
  const delayMs = customFilters?.pagination?.delayMs ?? 1000;
  
  const allItems: Array<{title:string; url:string}> = [];
  const seenUrls = new Set<string>();
  let detectedPattern: string | null = null;
  
  if (!paginationEnabled) {
    // Modo antigo: buscar apenas página base
    const { html } = await fetchHtml(base, renderMode);
    const $ = cheerio.load(html);
    const items = extractItems($, base, domainPattern, customFilters);
    allItems.push(...items);
  } else {
    // Modo com paginação
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      try {
        let html: string;
        let currentPattern: string;
        
        if (pageNum === 0) {
          // Primeira página: usar URL base
          const result = await fetchHtml(base, renderMode);
          html = result.html;
          currentPattern = paginationPattern;
        } else {
          // Páginas seguintes
          if (paginationPattern === 'auto') {
            // Detecção automática
            if (!detectedPattern) {
              const result = await tryPatterns(base, pageNum, renderMode, startFrom, itemsPerPage);
              if (!result) {
                console.log(`[Pagination] Nenhum padrão funcionou, parando na página ${pageNum}`);
                break;
              }
              html = result.html;
              detectedPattern = result.pattern;
              currentPattern = result.pattern;
            } else {
              // Usar padrão detectado
              const url = buildPageUrl(base, pageNum, detectedPattern, startFrom, itemsPerPage);
              const result = await fetchHtml(url, renderMode);
              html = result.html;
              currentPattern = detectedPattern;
            }
          } else {
            // Usar padrão especificado
            const url = buildPageUrl(base, pageNum, paginationPattern, startFrom, itemsPerPage);
            const result = await fetchHtml(url, renderMode);
            html = result.html;
            currentPattern = paginationPattern;
          }
        }
        
        const $ = cheerio.load(html);
        const items = extractItems($, base, domainPattern, customFilters);
        
        // Deduplicar por URL
        let newItemsCount = 0;
        for (const item of items) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allItems.push(item);
            newItemsCount++;
          }
        }
        
        console.log(`[Pagination] Página ${pageNum + 1}: ${newItemsCount} novos concursos (${items.length} total, ${allItems.length} únicos)`);
        
        // Se não encontrou nada novo, provavelmente chegou ao fim
        if (newItemsCount === 0 && pageNum > 0) {
          console.log(`[Pagination] Nenhum concurso novo na página ${pageNum + 1}, parando`);
          break;
        }
        
        // Delay entre páginas (exceto na última)
        if (pageNum < maxPages - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (e: any) {
        console.error(`[Pagination] Erro na página ${pageNum + 1}:`, e.message);
        // Se erro na página 0, propagar erro
        if (pageNum === 0) throw e;
        // Se erro em páginas seguintes, parar paginação
        break;
      }
    }
  }
  
  console.log(`[Pagination] Total final: ${allItems.length} concursos únicos`);
  
  // 2) persiste
  let count = 0;
  for (const it of allItems){
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
