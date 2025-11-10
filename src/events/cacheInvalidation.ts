import { cacheSet } from '../services/cache.js';
export async function invalidateKeys(keys: string[]){
  // placeholder: se estiver usando ioredis diretamente, você pode usar DEL; aqui mantemos simples
  for (const k of keys){
    await cacheSet(k, null, 1);
  }
}
