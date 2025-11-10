import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import { searchConcursosMock } from './services/scraper.js';
import { scrapeQueue, vectorQueue, getQueueConnection } from './jobs/queues.js';
import { pool } from './db/connection.js';
import { semanticSearch } from './services/vectorSearch.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: (process.env.CORS_ORIGIN || '*').split(','), credentials: true });

app.get('/health', async () => ({ status: 'ok' }));

// Busca (mock) de concursos
app.get('/concursos/search', async (req, reply) => {
  const q = (req.query as any)?.q || '';
  if (!q) return reply.code(400).send({ error: 'missing_q' });
  const items = await searchConcursosMock(q as string);
  return items;
});

// Cria job de scraping
app.post('/concursos/sync', async (req, reply) => {
  const body = req.body as { douUrl?: string };
  if (!body?.douUrl) return reply.code(400).send({ error: 'missing_douUrl' });
  const job = await scrapeQueue.add('scrape:contest', { douUrl: body.douUrl }, { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  return { jobId: job.id };
});

// Status do job
app.get('/jobs/:id', async (req, reply) => {
  const id = (req.params as any)?.id;
  const conn = getQueueConnection();
  const job = await scrapeQueue.getJob(id);
  if (!job) return reply.code(404).send({ error: 'not_found' });
  const state = await job.getState();
  const result = await job.returnvalue;
  return { id, state, result, progress: job.progress };
});

// Leitura básica do concurso
app.get('/concursos/:contestId', async (req, reply) => {
  const id = Number((req.params as any)?.contestId);
  if (!id) return reply.code(400).send({ error: 'invalid_id' });
  const { rows } = await pool.query('SELECT * FROM concursos WHERE id = $1', [id]);
  if (!rows?.[0]) return reply.code(404).send({ error: 'not_found' });
  // matérias e conteúdos agregados
  const { rows: mats } = await pool.query('SELECT * FROM materias WHERE contest_id = $1', [id]);
  const { rows: conts } = await pool.query('SELECT * FROM conteudos WHERE materia_id IN (SELECT id FROM materias WHERE contest_id = $1)', [id]);
  return { ...rows[0], materias: mats, conteudos: conts };
});

// Busca semântica
app.get('/concursos/:contestId/search', async (req, reply) => {
  const contestId = Number((req.params as any)?.contestId);
  const q = (req.query as any)?.q || '';
  if (!contestId) return reply.code(400).send({ error: 'invalid_id' });
  if (!q) return reply.code(400).send({ error: 'missing_q' });
  const rows = await semanticSearch(contestId, q);
  return rows;
});

const port = Number(process.env.PORT || 3001);
app.listen({ port, host: '0.0.0.0' }).then(()=>{
  console.log('[API] Listening on', port);
});
