import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db/connection.js';
import { addScrape } from './jobs/queues.js';
import { searchConcursosMock } from './services/scraper.js';
import { semanticSearch } from './services/vectorSearch.js';
import { makeRateLimit } from './plugins/rateLimit.js';
import { adminRoutes } from './routes/admin.js';
import { jobsStreamRoutes } from './routes/jobsStream.js';
import { SearchQuerySchema, SyncBodySchema, ContestIdParamsSchema, JobIdParamsSchema } from './schemas/concursos.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: (process.env.CORS_ORIGIN || '*').split(','), credentials: true });

const rateLimit = makeRateLimit(app, { maxPerMinute: 120 });

app.get('/health', async () => ({ status: 'ok' }));

app.get('/concursos/search', { preHandler: [rateLimit] }, async (req, reply) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const items = await searchConcursosMock(parsed.data.q);
  return items;
});

app.post('/concursos/sync', { preHandler: [rateLimit] }, async (req, reply) => {
  const parsed = SyncBodySchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const job = await addScrape(parsed.data.douUrl);
  return { jobId: job.id };
});

app.get('/jobs/:id', { preHandler: [rateLimit] }, async (req, reply) => {
  const parsed = JobIdParamsSchema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const { id } = parsed.data as any;
  const job = await (await import('./jobs/queues.js')).scrapeQueue.getJob(id);
  if (!job) return reply.code(404).send({ error: 'not_found' });
  const state = await job.getState();
  const result = job.returnvalue ?? null;
  return { id, state, result, progress: job.progress };
});

app.get('/concursos/:contestId', { preHandler: [rateLimit] }, async (req, reply) => {
  const parsed = ContestIdParamsSchema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const id = parsed.data.contestId;
  const { rows } = await pool.query('SELECT * FROM concursos WHERE id = $1', [id]);
  if (!rows?.[0]) return reply.code(404).send({ error: 'not_found' });
  const { rows: mats } = await pool.query('SELECT * FROM materias WHERE contest_id = $1', [id]);
  const { rows: conts } = await pool.query('SELECT * FROM conteudos WHERE materia_id IN (SELECT id FROM materias WHERE contest_id = $1)', [id]);
  return { ...rows[0], materias: mats, conteudos: conts };
});

app.get('/concursos/:contestId/search', { preHandler: [rateLimit] }, async (req, reply) => {
  const p1 = ContestIdParamsSchema.safeParse(req.params);
  const p2 = SearchQuerySchema.safeParse(req.query);
  if (!p1.success || !p2.success) return reply.code(400).send({ error: [p1.error?.issues, p2.error?.issues].filter(Boolean) });
  const rows = await semanticSearch(p1.data.contestId, p2.data.q);
  return rows;
});

// SSE (progresso)
await jobsStreamRoutes(app);
// Admin endpoints
await adminRoutes(app);

// Error handler padronizado
app.setErrorHandler((err, req, reply) => {
  req.log.error({ err }, 'unhandled');
  reply.code(500).send({ error: 'internal_error' });
});

const port = Number(process.env.PORT || 3001);
app.listen({ port, host: '0.0.0.0' }).then(()=>{
  console.log('[API] Listening on', port);
});
