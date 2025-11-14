import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export async function registerAdminBancasRoutes(app: FastifyInstance) {
  
  /**
   * GET /admin/bancas
   * Lista todas as bancas com estatísticas de concursos
   */
  app.get('/admin/bancas', async (req: any, reply) => {
    const { search, area, status, sort = 'name' } = req.query || {};
    
    const args: any[] = [];
    let where = 'WHERE 1=1';
    
    if (search) {
      args.push(`%${search}%`);
      where += ` AND (b.name ILIKE $${args.length} OR b.full_name ILIKE $${args.length})`;
    }
    
    if (status === 'active') {
      where += ' AND b.is_active = true';
    } else if (status === 'inactive') {
      where += ' AND b.is_active = false';
    }
    
    let orderBy = 'ORDER BY b.name ASC';
    if (sort === 'contests') {
      orderBy = 'ORDER BY total_contests DESC NULLS LAST, b.name ASC';
    } else if (sort === 'recent') {
      orderBy = 'ORDER BY b.created_at DESC';
    }
    
    const { rows } = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.full_name AS display_name,
        b.name AS short_name,
        b.website,
        b.website AS website_url,
        b.is_active,
        b.created_at,
        b.updated_at,
        COALESCE(c.total, 0) AS total_contests,
        ARRAY[]::text[] AS areas,
        '' AS description
      FROM bancas b
      LEFT JOIN (
        SELECT banca_id, COUNT(*) AS total
        FROM concursos
        GROUP BY banca_id
      ) c ON c.banca_id = b.id
      ${where}
      ${orderBy}
    `, args);
    
    reply.send(rows);
  });
  
  /**
   * GET /admin/bancas/stats
   * Estatísticas gerais de bancas
   */
  app.get('/admin/bancas/stats', async (req: any, reply) => {
    const { rows: [stats] } = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active,
        COALESCE(SUM((
          SELECT COUNT(*) FROM concursos WHERE banca_id = bancas.id
        )), 0)::int AS total_contests
      FROM bancas
    `);
    
    const { rows: [topBanca] } = await pool.query(`
      SELECT 
        b.full_name AS display_name,
        COUNT(c.id)::int AS total_contests
      FROM bancas b
      LEFT JOIN concursos c ON c.banca_id = b.id
      GROUP BY b.id, b.full_name
      ORDER BY COUNT(c.id) DESC
      LIMIT 1
    `);
    
    reply.send({
      ...stats,
      top_banca: topBanca || null
    });
  });
  
  /**
   * GET /admin/bancas/:id
   * Detalhes de uma banca específica
   */
  app.get('/admin/bancas/:id', async (req: any, reply) => {
    const { id } = req.params;
    
    const { rows: [banca] } = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.full_name AS display_name,
        b.name AS short_name,
        b.website,
        b.website AS website_url,
        b.is_active,
        b.created_at,
        b.updated_at,
        COALESCE(c.total, 0) AS total_contests,
        ARRAY[]::text[] AS areas,
        '' AS description
      FROM bancas b
      LEFT JOIN (
        SELECT banca_id, COUNT(*) AS total
        FROM concursos
        WHERE banca_id = $1
        GROUP BY banca_id
      ) c ON c.banca_id = b.id
      WHERE b.id = $1
    `, [id]);
    
    if (!banca) {
      return reply.status(404).send({ error: 'Banca não encontrada' });
    }
    
    reply.send(banca);
  });
  
  /**
   * DELETE /admin/bancas/:id
   * Deleta uma banca
   */
  app.delete('/admin/bancas/:id', async (req: any, reply) => {
    const { id } = req.params;
    
    await pool.query('DELETE FROM bancas WHERE id = $1', [id]);
    
    reply.send({ success: true });
  });
}
