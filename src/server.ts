import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db/connection.js';

import { searchConcursosMock } from './services/scraper.js';
import { semanticSearch } from './services/vectorSearch.js';
import { makeRateLimit } from './plugins/rateLimit.js';
import { errorHandlerPlugin } from './errors/errorHandler.js';
import sentry from './plugins/sentry.js';
import security from './plugins/security.js';
import { metricsOnResponse } from './metrics/metrics.js';

// Legacy routes (concursos/scraping)
import { adminRoutes } from './routes/admin.js';
import { jobsStreamRoutes } from './routes/jobsStream.js';
import { migrateRoutes } from './routes/migrate.js';
import { SearchQuerySchema, SyncBodySchema, ContestIdParamsSchema, JobIdParamsSchema } from './schemas/concursos.js';

// New app routes (users/decks/cards/study)
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { decksRoutes } from './routes/decks.js';
import { cardsRoutes } from './routes/cards.js';
import { studySessionsRoutes } from './routes/study-sessions.js';
import { reviewsRoutes } from './routes/reviews.js';
import { llmRoutes } from './routes/llm.js';
import { notificationsRoutes } from './routes/notifications.js';
import { healthRoutes } from './routes/health.js';
import { docsRoutes } from './routes/docs.js';
import { queuesRoutes } from './routes/queues.js';
import { authExtraRoutes } from './routes/auth-extra.js';
import { profileRoutes } from './routes/profile.js';
import { statsRoutes } from './routes/stats.js';
import { searchRoutes } from './routes/search.js';
import { importExportRoutes } from './routes/import-export.js';
import { oauthRoutes } from './routes/oauth.js';
import { totpRoutes } from './routes/totp.js';
import { devicesRoutes } from './routes/devices.js';
import { importMultipartRoutes } from './routes/import-multipart.js';
import { notificationPrefsRoutes } from './routes/notification-prefs.js';

const app = Fastify({ logger: true, ignoreTrailingSlash: true });

await app.register(sentry);
await app.register(security);

await app.register(cors, { 
  origin: (process.env.CORS_ORIGIN || '*').split(','), 
  credentials: true 
});

await app.register(errorHandlerPlugin);

app.addHook('onResponse', metricsOnResponse());

const rateLimit = makeRateLimit(app, { maxPerMinute: 120 });

// Health check and monitoring
await app.register(healthRoutes);
await app.register(docsRoutes);
await app.register(queuesRoutes);

// ============================================
// NEW APP ROUTES (flashcards system)
await app.register(llmRoutes);
// ============================================

// Auth routes
await app.register(authRoutes);
await app.register(authExtraRoutes);
await app.register(usersRoutes);
await app.register(profileRoutes);
await app.register(decksRoutes);
await app.register(cardsRoutes);
await app.register(studySessionsRoutes);
await app.register(reviewsRoutes);
await app.register(notificationsRoutes);
await app.register(statsRoutes);
await app.register(searchRoutes);
await app.register(importExportRoutes);
await app.register(oauthRoutes);
await app.register(totpRoutes);
await app.register(devicesRoutes);
await app.register(importMultipartRoutes);
await app.register(notificationPrefsRoutes);

// ============================================
// LEGACY ROUTES (concursos/scraping)
// ============================================
app.get('/concursos/search', { preHandler: [rateLimit] }, async (req, reply) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const items = await searchConcursosMock(parsed.data.q);
  return items;
});

app.post('/concursos/sync', { preHandler: [rateLimit] }, async (req, reply) => {
  const parsed = SyncBodySchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const job = await (await import('./jobs/queues.js')).scrapeQueue.add('scrape', { url: parsed.data.douUrl });
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
// Migration endpoint (temporary)
await migrateRoutes(app);

// Garante que tudo foi carregado antes de expor o Swagger
await app.ready();
// Se o decorator swagger existir (registrado por docsRoutes), constrói o JSON
if (typeof (app as any).swagger === 'function') {
  (app as any).swagger();
}

const port = Number(process.env.PORT || 3001);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log('[API] Listening on', port);
});
