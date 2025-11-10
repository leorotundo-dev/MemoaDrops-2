import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import process from 'node:process';
import client from 'prom-client';

const registry = new client.Registry();
registry.setDefaultLabels({ app: 'memodrops' });
client.collectDefaultMetrics({ register: registry });

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));
  app.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
  app.get('/env', async () => ({
    node: process.version,
    platform: os.platform(),
    mem: process.memoryUsage().rss
  }));
}
