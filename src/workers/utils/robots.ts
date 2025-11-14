export async function canFetch(url: string, ua: string){
  try{
    const u = new URL(url);
    const robotsUrl = new URL('/robots.txt', `${u.protocol}//${u.host}`).href;
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': ua }});
    if (!res.ok) return true;
    const txt = (await res.text()).toLowerCase();
    if (txt.includes('disallow') && url.includes('/concursos')) return false;
    return true;
  }catch{ return true; }
}
