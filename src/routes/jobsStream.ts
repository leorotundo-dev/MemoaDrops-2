import type { FastifyInstance } from 'fastify';
import { JobIdParamsSchema } from '../schemas/concursos.js';
import { scrapeQueue } from '../jobs/queues.js';

export async function jobsStreamRoutes(app: FastifyInstance) {
  app.get('/jobs/:id/stream', async (req, reply) => {
    const parsed = JobIdParamsSchema.safeParse((req.params as any));
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_id' });
    const id = parsed.data.id;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    const job = await scrapeQueue.getJob(id);
    if (!job) {
      reply.raw.write(`event: error\n`);
      reply.raw.write(`data: ${JSON.stringify({ error: 'not_found' })}\n\n`);
      reply.raw.end();
      return reply;
    }

    const send = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send('state', { state: await job.getState(), progress: job.progress });

    const timer = setInterval(async () => {
      const state = await job.getState();
      const progress = job.progress;
      send('state', { state, progress });
      if (state === 'completed' || state === 'failed') {
        const result = job.returnvalue ?? null;
        send(state, { result });
        clearInterval(timer);
        reply.raw.end();
      }
    }, 1200);

    req.raw.on('close', () => clearInterval(timer));
    return reply;
  });
}
