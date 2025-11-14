import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { pool } from '../db/connection.js';

export async function registerAdminBancaRoutes(app: FastifyInstance) {
  // TEMPORÁRIO: Endpoint público para executar scraper (REMOVER DEPOIS!)
  app.post('/public/scrape-all-bancas', async (_req, reply) => {
    try {
      const { scrapeAllBancasContests } = await import('../services/contest-discovery-scraper.js');
      const result = await scrapeAllBancasContests();
      return { 
        success: true, 
        total_found: result.total, 
        total_saved: result.saved,
        message: `Scraping concluído! ${result.saved} novos concursos salvos de ${result.total} encontrados.`
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message, stack: e.stack });
    }
  });

  // Executar scraper de concursos para todas as bancas (DEVE VIR ANTES DE /admin/bancas/:id)
  app.post('/admin/bancas/scrape-all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    try {
      const { scrapeAllBancasContests } = await import('../services/contest-discovery-scraper.js');
      const result = await scrapeAllBancasContests();
      return { 
        success: true, 
        total_found: result.total, 
        total_saved: result.saved,
        message: `Scraping concluído! ${result.saved} novos concursos salvos de ${result.total} encontrados.`
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Executar scraper de uma banca específica
  app.post('/admin/bancas/:id/scrape', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { scrapeBancaContests, saveDiscoveredContests, updateBancaContestCount } = await import('../services/contest-discovery-scraper.js');
      
      const contests = await scrapeBancaContests(parseInt(id));
      const saved = await saveDiscoveredContests(contests);
      await updateBancaContestCount(parseInt(id));
      
      return { 
        success: true, 
        total_found: contests.length, 
        total_saved: saved,
        message: `Scraping concluído! ${saved} novos concursos salvos de ${contests.length} encontrados.`
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Estatísticas gerais (DEVE VIR ANTES DE /admin/bancas/:id)
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

  // Listar bancas
  app.get('/admin/bancas', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { search, area, status, sort } = request.query as any;
      let query = `SELECT b.* FROM bancas b WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (b.name ILIKE $${paramCount} OR b.display_name ILIKE $${paramCount} OR b.short_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }
      if (area && area !== 'all') {
        paramCount++;
        query += ` AND b.areas::jsonb @> $${paramCount}::jsonb`;
        params.push(JSON.stringify([area]));
      }
      if (status === 'active') query += ` AND b.is_active = true`;
      else if (status === 'inactive') query += ` AND b.is_active = false`;

      if (sort === 'name') query += ` ORDER BY b.name ASC`;
      else if (sort === 'contests') query += ` ORDER BY b.total_contests DESC`;
      else query += ` ORDER BY b.created_at DESC`;

      const { rows } = await pool.query(query, params);
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Criar banca
  app.post('/admin/bancas', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      let { name, display_name, short_name, website_url, logo_url, description, areas, scraper_id } = request.body as any;
      
      // Verificar se já existe banca com o mesmo name ou short_name
      const { rows: existing } = await pool.query(`
        SELECT id, name, display_name FROM bancas 
        WHERE name = $1 OR short_name = $2
        LIMIT 1`,
        [name, short_name]);
      
      if (existing.length > 0) {
        return reply.status(409).send({ 
          error: 'Banca já existe',
          message: `Já existe uma banca cadastrada com este nome: "${existing[0].display_name}"`,
          existing: existing[0]
        });
      }
      
      // Criar a banca primeiro sem logo
      const { rows: [banca] } = await pool.query(`
        INSERT INTO bancas (name, display_name, short_name, website_url, logo_url, description, areas, scraper_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [name, display_name, short_name || null, website_url || null, logo_url || null, description || null, JSON.stringify(areas || []), scraper_id || null]);
      
      // Buscar e salvar logo automaticamente no banco de dados
      if (display_name && banca.id) {
        try {
          const { fetchAndSaveBancaLogo } = await import('../services/logo-fetcher.js');
          await fetchAndSaveBancaLogo(banca.id, display_name, website_url);
          console.log(`Logo buscado automaticamente para ${display_name}`);
        } catch (err) {
          console.error(`Erro ao buscar logo automaticamente para ${display_name}:`, err);
          // Continuar sem logo
        }
      }
      
      return banca;
    } catch (e: any) {
      // Tratar erro de constraint UNIQUE
      if (e.code === '23505') { // Postgres unique violation
        return reply.status(409).send({ error: 'Banca duplicada', message: 'Já existe uma banca com este nome ou sigla' });
      }
      return reply.status(500).send({ error: e.message });
    }
  });

  // Detalhes (DEVE VIR DEPOIS DE /admin/bancas/stats)
  app.get('/admin/bancas/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows: [banca] } = await pool.query(`
        SELECT b.*
        FROM bancas b
        WHERE b.id=$1`, [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
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

  // Listar concursos de uma banca
  app.get('/admin/bancas/:id/contests', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { limit = 50, offset = 0 } = request.query as any;
      
      // Verificar se a banca existe
      const { rows: [banca] } = await pool.query('SELECT id FROM bancas WHERE id=$1', [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      
      // Buscar concursos da banca
      const { rows } = await pool.query(`
        SELECT id, nome, dou_url, created_at
        FROM concursos
        WHERE banca_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [id, limit, offset]);
      
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Estatísticas de concursos por ano para uma banca
  app.get('/admin/bancas/:id/stats', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      
      // Verificar se a banca existe
      const { rows: [banca] } = await pool.query('SELECT id FROM bancas WHERE id=$1', [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      
      // Buscar estatísticas por ano
      const { rows } = await pool.query(`
        SELECT 
          EXTRACT(YEAR FROM created_at)::int AS year,
          COUNT(*)::int AS total_contests
        FROM concursos
        WHERE banca_id = $1
        GROUP BY EXTRACT(YEAR FROM created_at)
        ORDER BY year DESC
        LIMIT 10
      `, [id]);
      
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
