import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import IORedis from 'ioredis';

type RateOpts = {
  redisUrl?: string;
  maxPerMinute?: number;
  keyFn?: (req: FastifyRequest) => string;
};

export function makeRateLimit(app: FastifyInstance, opts: RateOpts = {}) {
  const redis = new IORedis(opts.redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  const max = opts.maxPerMinute ?? 60;
  const keyFn = opts.keyFn ?? ((req) => `${(req as any).routerPath || req.url}:${(req.headers['x-forwarded-for'] || req.ip)}`);

  return async function rateLimit(req: FastifyRequest, reply: FastifyReply) {
    const key = `ratelimit:${keyFn(req)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60); // janela 60s
    if (count > max) {
      return reply.code(429).send({ error: 'rate_limited', retry_in_seconds: await redis.ttl(key) });
    }
  };
}
