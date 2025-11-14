function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }
export class RateLimiter {
  private delay:number; private jitter:number;
  constructor(delayMs=700, jitterMs=300){ this.delay=delayMs; this.jitter=jitterMs; }
  async wait(){ const j = Math.floor(Math.random()*this.jitter); await sleep(this.delay+j); }
}
export async function backoff<T>(fn:()=>Promise<T>, attempts=2, base=600){
  let i=0, err:any;
  while(i<attempts){
    try{ return await fn(); }catch(e){ err=e; await sleep(base * Math.pow(2,i)); i++; }
  }
  throw err;
}
