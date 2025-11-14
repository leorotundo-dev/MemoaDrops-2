import { bumpDomainCounter } from './metrics.js';

export type FetchMeta = { etag?:string; lastModified?:string; status?:number };
export async function getIfChanged(url: string, ua: string, meta?: FetchMeta){
  const headers: Record<string,string> = { 'User-Agent': ua, 'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.8' };
  if (meta?.etag) headers['If-None-Match'] = meta.etag;
  if (meta?.lastModified) headers['If-Modified-Since'] = meta.lastModified;
  const res = await fetch(url, { headers });
  // metrics
  const d = new URL(url).host;
  if (res.status >= 500) await bumpDomainCounter(d, '5xx');
  else if (res.status >= 400) await bumpDomainCounter(d, '4xx');
  else await bumpDomainCounter(d, 'ok');
  const out = { 
    status: res.status, 
    etag: res.headers.get('etag') || undefined,
    lastModified: res.headers.get('last-modified') || undefined,
    html: res.status === 304 ? '' : await res.text()
  };
  return out;
}
