import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../db/connection.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

export async function registerAdminBancaRoutes(app: FastifyInstance) {
  // Listar bancas com filtros e ordenação
  app.get('/admin/bancas', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { status, area, search, sort = 'name' } = request.query as any;
      const params: any[] = [];
      let where = 'WHERE 1=1';
      let i = 1;

      if (status === 'active') where += ` AND is_active = true`;
      else if (status === 'inactive') where += ` AND is_active = false`;

      if (area) { where += ` AND areas @> $${i}::jsonb`; params.push(JSON.stringify([area])); i++; }
      if (search) { where += ` AND (name ILIKE $${i} OR display_name ILIKE $${i} OR short_name ILIKE $${i})`; params.push(`%${search}%`); i++; }

      let order = 'ORDER BY name ASC';
      if (sort === 'contests') order = 'ORDER BY total_contests DESC';
      else if (sort === 'recent') order = 'ORDER BY last_contest_date DESC NULLS LAST';

      const sql = `
        SELECT b.*
        FROM bancas b
        ${where}
        ${order}`;
      const { rows } = await pool.query(sql, params);
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Criar banca
  app.post('/admin/bancas', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { name, display_name, short_name, website_url, logo_url, description, areas, scraper_id } = request.body as any;
      const { rows: [banca] } = await pool.query(`
        INSERT INTO bancas (name, display_name, short_name, website_url, logo_url, description, areas, scraper_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [name, display_name, short_name || null, website_url || null, logo_url || null, description || null, JSON.stringify(areas || []), scraper_id || null]);
      return banca;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Atualizar banca
  app.put('/admin/bancas/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { display_name, short_name, website_url, logo_url, description, areas, is_active, scraper_id } = request.body as any;
      const { rows: [banca] } = await pool.query(`
        UPDATE bancas SET
          display_name = COALESCE($1, display_name),
          short_name = $2,
          website_url = $3,
          logo_url = $4,
          description = $5,
          areas = COALESCE($6, areas),
          is_active = COALESCE($7, is_active),
          scraper_id = $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *`,
        [display_name, short_name, website_url, logo_url, description, areas ? JSON.stringify(areas) : null, is_active, scraper_id, id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      return banca;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Deletar banca
  app.delete('/admin/bancas/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows: [banca] } = await pool.query('DELETE FROM bancas WHERE id=$1 RETURNING *', [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      return { message: 'Banca deleted successfully', banca };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Detalhes
  app.get('/admin/bancas/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows: [banca] } = await pool.query(`
        SELECT b.*, s.display_name AS scraper_name, s.id AS scraper_id
        FROM bancas b
        LEFT JOIN scrapers s ON b.scraper_id = s.id
        WHERE b.id=$1`, [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      return banca;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Estatísticas gerais
  app.get('/admin/bancas/stats', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    try {
      const { rows: [stats] } = await pool.query(`
        SELECT COUNT(*)::int AS total,
               SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active,
               COALESCE(SUM(total_contests),0)::int AS total_contests
        FROM bancas`);
      const { rows: [top] } = await pool.query(`
        SELECT display_name, total_contests
        FROM bancas WHERE total_contests > 0
        ORDER BY total_contests DESC
        LIMIT 1`);
      return { ...stats, top_banca: top || null };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Estatísticas por ano (últimos 10 registros)
  app.get('/admin/bancas/:id/stats', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows } = await pool.query(`
        SELECT year, total_contests, total_candidates
        FROM banca_stats WHERE banca_id=$1
        ORDER BY year DESC
        LIMIT 10`, [id]);
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Concursos por banca (placeholder)
  app.get('/admin/bancas/:id/contests', { preHandler: [authenticate, requireAdmin] }, async (_request, _reply) => {
    try {
      return [];
    } catch (e: any) {
      return [];
    }
  });

  // Importação em massa via CSV parseado no frontend
  app.post('/admin/bancas/import', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { bancas } = (request.body || {}) as any;
      const results = { success: 0, errors: [] as string[] };
      if (!Array.isArray(bancas)) return reply.status(400).send({ error: 'bancas deve ser um array' });
      for (const b of bancas) {
        try {
          await pool.query(`
            INSERT INTO bancas (name, display_name, short_name, website_url, logo_url, description, areas)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (name) DO NOTHING`,
            [b.name, b.display_name, b.short_name || null, b.website_url || null, b.logo_url || null, b.description || null, JSON.stringify(b.areas || [])]);
          results.success++;
        } catch (e: any) {
          results.errors.push(`${b.name}: ${e.message}`);
        }
      }
      return results;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
