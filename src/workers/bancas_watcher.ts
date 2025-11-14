import * as fs from 'fs';
import path from 'path';
import { RateLimiter, backoff } from './utils/rate.js';
import { canFetch } from './utils/robots.js';
import { closeHeadless } from './utils/headless.js';

const UA = process.env.HARVEST_USER_AGENT || 'MemoDropsHarvester/1.0 (+contato)';

function loadIds(): Array<{id:string, render_mode:'static'|'headless', base:string}>{
  const y = fs.readFileSync('config/bancas.yml','utf-8');
  const entries = [...y.matchAll(/- id: (\w+)[\s\S]*?base: (.+)\n[\s\S]*?render_mode: (\w+)/g)];
  return entries.map(m=>({ id: m[1], base: m[2].trim(), render_mode: (m[3].trim() as any) }));
}

async function runOne(id:string){
  const modPath = path.resolve(`workers/adapters/bancas/${id}.js`);
  const mod = await import(modPath);
  const { run } = mod;
  const res = await run();
  return res;
}

async function main(){
  const lim = new RateLimiter(800, 400);
  const list = loadIds();
  const results:any[] = [];
  for (const item of list){
    const ok = await canFetch(item.base, UA);
    if (!ok){ results.push({ id: item.id, skipped: 'robots' }); continue; }
    await lim.wait();
    const r = await backoff(()=> runOne(item.id), 2, 700).catch(e=>({ id:item.id, error: e?.message||String(e) }));
    results.push(r);
  }
  console.log(JSON.stringify({ ok:true, results }, null, 2));
  await closeHeadless();
}
if (process.argv[1] && process.argv[1].includes('bancas_watcher')){
  main().catch(e=>{ console.error(e); process.exit(1); });
}
