import type { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { scrapeQueue, vectorQueue } from '../jobs/queues.js';
import { pool } from '../db/connection.js';

export async function adminRoutes(app: FastifyInstance) {
  // Reprocessar job (scrape/vector)
  app.post('/admin/jobs/:queue/:id/retry', async (req, reply) => {
    const { queue, id } = (req.params as any);
    const q: Queue = queue === 'vector' ? vectorQueue : scrapeQueue;
    const job = await q.getJob(id);
    if (!job) return reply.code(404).send({ error: 'not_found' });
    await job.retry();
    return { ok: true };
  });

  // Reenfileirar vetorização de um conteúdo
  app.post('/admin/requeue/vector', async (req, reply) => {
    const { conteudoId } = (req.body as any) || {};
    if (!conteudoId) return reply.code(400).send({ error: 'missing_conteudoId' });
    await vectorQueue.add('vector:conteudo', { conteudoId }, { removeOnComplete: true, attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
    return { ok: true };
  });

  // Listar tabelas do banco
  app.get('/admin/tables', async () => {
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    return { tables: rows.map(r => r.table_name) };
  });

  // Estatísticas simples
  app.get('/admin/stats', async () => {
    const { rows: c1 } = await pool.query('SELECT COUNT(*)::int AS concursos FROM concursos');
    const { rows: c2 } = await pool.query('SELECT COUNT(*)::int AS materias FROM materias');
    const { rows: c3 } = await pool.query('SELECT COUNT(*)::int AS conteudos FROM conteudos');
    const { rows: c4 } = await pool.query('SELECT COUNT(*)::int AS jobs FROM jobs');
    return { ...c1[0], ...c2[0], ...c3[0], ...c4[0] };
  });
}
