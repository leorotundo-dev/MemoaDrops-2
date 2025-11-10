import type { FastifyInstance } from 'fastify';
import { FastifyAdapter } from '@bull-board/fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { llmQueue } from '../jobs/llmQueue.js';
import { notificationsQueue } from '../jobs/notificationsQueue.js';

export async function queuesRoutes(app: FastifyInstance) {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/queues');
  createBullBoard({
    queues: [
      new BullMQAdapter(llmQueue),
      new BullMQAdapter(notificationsQueue)
    ],
    serverAdapter
  });
  app.register(serverAdapter.registerPlugin(), { prefix: '/queues' });
}
