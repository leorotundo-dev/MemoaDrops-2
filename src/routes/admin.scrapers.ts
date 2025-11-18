import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../db/connection.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

import { getScraperStatus } from '../services/scraper-monitor.js';

export async function registerAdminScraperRoutes(app: FastifyInstance) {

  // Status do Scraper (Monitoramento)
  app.get('/admin/scrapers/status', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    try {
      const status = await getScraperStatus();
      return status;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });
  // Listar
  app.get('/admin/scrapers', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { category, status, search } = request.query as any;
      const params: any[] = [];
      let where = 'WHERE 1=1';
      let i = 1;

      if (category) { where += ` AND s.category = $${i++}`; params.push(category); }
      if (status === 'active') where += ` AND s.is_active = true`;
      if (status === 'inactive') where += ` AND s.is_active = false`;
      if (search) { where += ` AND (s.name ILIKE $${i} OR s.display_name ILIKE $${i})`; params.push(`%${search}%`); i++; }

      const sql = `
        SELECT s.*,
          COUNT(l.id)::int AS total_tests,
          SUM(CASE WHEN l.status='success' THEN 1 ELSE 0 END)::int AS successful_tests
        FROM scrapers s
        LEFT JOIN scraper_logs l ON l.scraper_id = s.id
        ${where}
        GROUP BY s.id
        ORDER BY s.category, s.priority, s.name
      `;
      const { rows } = await pool.query(sql, params);
      return rows;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Criar
  app.post('/admin/scrapers', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { name, display_name, category, hostname_pattern, adapter_file, priority, description, test_url, is_active } = request.body as any;
      if (!name || !display_name || !category || !hostname_pattern || !adapter_file) {
        return reply.code(400).send({ error: 'Campos obrigatórios ausentes' });
      }
      const { rows: [scraper] } = await pool.query(`
        INSERT INTO scrapers (name, display_name, category, hostname_pattern, adapter_file, priority, description, test_url, is_active)
        VALUES ($1,$2,$3,$4,$5,COALESCE($6,100),$7,$8,COALESCE($9,true)) RETURNING *`,
        [name, display_name, category, hostname_pattern, adapter_file, priority, description, test_url, is_active]);
      return scraper;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Atualizar
  app.put('/admin/scrapers/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { display_name, category, hostname_pattern, adapter_file, is_active, priority, description, test_url } = request.body as any;
      const { rows: [scraper] } = await pool.query(`
        UPDATE scrapers SET
          display_name = COALESCE($1, display_name),
          category = COALESCE($2, category),
          hostname_pattern = COALESCE($3, hostname_pattern),
          adapter_file = COALESCE($4, adapter_file),
          is_active = COALESCE($5, is_active),
          priority = COALESCE($6, priority),
          description = $7,
          test_url = $8,
          updated_at = NOW()
        WHERE id=$9 RETURNING *`,
        [display_name, category, hostname_pattern, adapter_file, is_active, priority, description, test_url, id]);
      if (!scraper) return reply.code(404).send({ error: 'Scraper not found' });
      return scraper;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Deletar
  app.delete('/admin/scrapers/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows: [scraper] } = await pool.query('DELETE FROM scrapers WHERE id=$1 RETURNING *', [id]);
      if (!scraper) return reply.code(404).send({ error: 'Scraper not found' });
      return { message: 'Scraper deleted successfully', scraper };
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Detalhes
  app.get('/admin/scrapers/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows: [scraper] } = await pool.query('SELECT * FROM scrapers WHERE id=$1', [id]);
      if (!scraper) return reply.code(404).send({ error: 'Scraper not found' });
      return scraper;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Teste por URL (usa serviço de scraping/adapters)
  app.post('/admin/scrapers/:id/test', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { url } = request.body as any;
      if (!url) return reply.code(400).send({ error: 'url obrigatória' });
      const { rows: [scraper] } = await pool.query('SELECT * FROM scrapers WHERE id=$1', [id]);
      if (!scraper) return reply.code(404).send({ error: 'Scraper not found' });

      const start = Date.now();
      let status = 'success'; let materiasFound = 0; let errorMessage: string | null = null;
      try {
        const { scrapeContest } = await import('../services/scraper.js');
        const result = await scrapeContest(url);
        materiasFound = Array.isArray(result?.materias) ? result.materias.length : 0;
      } catch (err:any) {
        status = 'error'; errorMessage = err?.message || 'unknown error';
      }
      const executionTime = Date.now() - start;
      await pool.query(
        `INSERT INTO scraper_logs (scraper_id, url, status, materias_found, error_message, execution_time)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, url, status, materiasFound, errorMessage, executionTime]
      );
      await pool.query(`UPDATE scrapers SET last_tested_at=NOW(), last_test_success=$1 WHERE id=$2`, [status==='success', id]);

      return { status, materias_found: materiasFound, execution_time: executionTime, error_message: errorMessage };
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Logs
  app.get('/admin/scrapers/:id/logs', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { limit = '50', status } = (request.query || {}) as any;
      const params: any[] = [id]; let where = 'WHERE scraper_id=$1';
      if (status) { where += ` AND status = $2`; params.push(status); }
      const { rows } = await pool.query(
        `SELECT id, url, status, materias_found, error_message, execution_time, to_char(created_at,'YYYY-MM-DD HH24:MI') AS created_at
         FROM scraper_logs ${where}
         ORDER BY created_at DESC
         LIMIT ${Math.min(Math.max(parseInt(limit), 1), 500)}`,
        params
      );
      return rows;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Stats
  app.get('/admin/scrapers/stats', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    try {
      const { rows: [stats] } = await pool.query(`
        SELECT 
          COUNT(*)::int AS total,
          SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active,
          SUM(CASE WHEN COALESCE(last_test_success,false)=false AND last_tested_at IS NOT NULL THEN 1 ELSE 0 END)::int AS with_errors,
          CASE WHEN (SELECT COUNT(*) FROM scraper_logs)=0 THEN 0
               ELSE ROUND( (SELECT COUNT(*) FROM scraper_logs WHERE status='success')*100.0 / GREATEST(1,(SELECT COUNT(*) FROM scraper_logs)) , 1)
          END AS success_rate
        FROM scrapers
      `);
      return stats;
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });

  // Qual adapter seria usado para uma URL
  app.post('/admin/scrapers/test-url', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { url } = request.body as any;
      if (!url) return reply.code(400).send({ error: 'url obrigatória' });
      const { pickAdapter } = await import('../services/adapters/index.js');
      const adapter = pickAdapter(url);
      return { url, adapter_name: adapter?.name || 'desconhecido' };
    } catch (e:any) { return reply.code(500).send({ error: e.message }); }
  });
}
