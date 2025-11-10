import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

export default fp(async (app) => {
  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip
  });
});
