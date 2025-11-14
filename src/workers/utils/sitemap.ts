import { parseStringPromise } from 'xml2js';

export async function discoverFromSitemap(base: string){
  try{
    const u = new URL(base);
    const sitemap = new URL('/sitemap.xml', `${u.protocol}//${u.host}`).href;
    const res = await fetch(sitemap);
    if (!res.ok) return [];
    const xml = await res.text();
    const data = await parseStringPromise(xml);
    const urls: string[] = [];
    const urlset = data?.urlset?.url || [];
    for (const it of urlset){
      const loc = it?.loc?.[0];
      if (typeof loc === 'string') urls.push(loc);
    }
    return urls;
  }catch{
    return [];
  }
}
