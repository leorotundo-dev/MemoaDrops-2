import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import process from 'node:process';
import * as client from 'prom-client';  // uso padrão do prom-client

// Instância de Registry única (evita duplicação em hot reload)
const registry = new client.Registry();
registry.setDefaultLabels({ app: 'memodrops' });
client.collectDefaultMetrics({ register: registry });

export const healthRoutes = fp(async function (app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));

  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', registry.contentType);
    const body = await registry.metrics();
    return reply.send(body);
  });

  app.get('/env', async () => ({
    node: process.version,
    platform: os.platform(),
    mem: process.memoryUsage().rss
  }));
});
