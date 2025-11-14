import * as cheerio from 'cheerio';
import { upsertContest, logUpdate, sha256, enqueueReview } from './_utils.js';
import { getIfChanged } from '../../utils/http_conditional.js';
import { headlessFetch } from '../../utils/headless.js';
import { detectBlock } from '../../utils/captcha.js';

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

export async function runBanca(bancaId:number, base:string, domainPattern:RegExp, renderMode:'static'|'headless'){
  // 1) baixa listagem
  const { html } = await fetchHtml(base, renderMode);
  const $ = cheerio.load(html);
  const items: Array<{title:string; url:string}> = [];

  $('a').each((_,a)=>{
    const href = $(a).attr('href')||'';
    const text = $(a).text().trim();
    if (!href || !text) return;
    if (!/concurso|inscri|edital|seletivo/i.test(text)) return;
    const url = makeAbs(base, href);
    if (!domainPattern.test(url)) return;
    items.push({ title: text, url });
  });

  // 2) persiste
  let count = 0;
  for (const it of items.slice(0, 100)){
    const external_id = sha256(it.url).slice(0,16);
    await upsertContest(bancaId, external_id, {
      title: it.title, url: it.url, status: null, raw: { source: bancaId }
    });
    await logUpdate(bancaId, external_id, it.title, it.url);
    count++;
  }
  return { bancaId, found: count };
}

export async function safeRunBanca(bancaId:number, base:string, pattern:RegExp, mode:'static'|'headless'){
  try{
    return await runBanca(bancaId, base, pattern, mode);
  }catch(e:any){
    const reason = String(e?.message||e);
    await enqueueReview(bancaId, base, reason);
    return { bancaId, error: reason };
  }
}
