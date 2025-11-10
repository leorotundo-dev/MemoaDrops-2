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

  // Executar migration 003 manualmente
  app.post('/admin/migrate003', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const file = resolve(process.cwd(), 'src/db/migrations/003_add_password.sql');
    const sql = readFileSync(file, 'utf-8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      return { success: true, message: 'Migration 003 executed' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return { success: false, error: err.message, code: err.code, detail: err.detail };
    } finally {
      client.release();
    }
  });

  // Executar migration 002 manualmente
  app.post('/admin/migrate002', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const file = resolve(process.cwd(), 'src/db/migrations/002_app_schema.sql');
    const sql = readFileSync(file, 'utf-8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      return { success: true, message: 'Migration 002 executed' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return { success: false, error: err.message, code: err.code, detail: err.detail };
    } finally {
      client.release();
    }
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
