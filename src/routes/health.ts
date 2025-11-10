import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import process from 'node:process';
import * as client from 'prom-client';

const registry = new client.Registry();
registry.setDefaultLabels({ app: 'memodrops' });
client.collectDefaultMetrics({ register: registry });

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/metrics', async (_req, reply) => {
    const metrics = await registry.metrics();
    reply.type(registry.contentType).send(metrics);
  });

  app.get('/env', async () => ({
    node: process.version,
    platform: os.platform(),
    mem: process.memoryUsage().rss
  }));
}
