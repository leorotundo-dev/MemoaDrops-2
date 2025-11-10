import IORedis from 'ioredis';
const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new IORedis(url, { maxRetriesPerRequest: null });

export async function cacheGet<T=any>(key: string): Promise<T|null> {
  const v = await redis.get(key);
  return v ? JSON.parse(v) as T : null;
}
export async function cacheSet(key: string, value: any, ttlSeconds=600) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}
