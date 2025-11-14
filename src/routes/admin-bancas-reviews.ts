import type { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

/**
 * Rotas admin para gestão de revisões manuais de scraping
 * Gerencia URLs bloqueadas por CAPTCHA, WAF, etc.
 */
export async function registerAdminBancasReviews(app: FastifyInstance) {
  
  /**
   * GET /admin/bancas/reviews
   * Lista revisões manuais pendentes ou resolvidas
   */
  app.get('/admin/bancas/reviews', async (req: any, reply) => {
    const { status = 'open', limit = 50 } = req.query || {};
    
    const { rows } = await pool.query(`
      SELECT 
        mr.*,
        b.name AS banca_name
      FROM manual_reviews mr
      LEFT JOIN bancas b ON b.id = mr.banca_id
      WHERE mr.status = $1
      ORDER BY mr.created_at DESC
      LIMIT $2
    `, [status, limit]);
    
    reply.send({
      status,
      total: rows.length,
      reviews: rows
    });
  });
  
  /**
   * POST /admin/bancas/reviews/:id/resolve
   * Marca revisão como resolvida ou ignorada
   */
  app.post('/admin/bancas/reviews/:id/resolve', async (req: any, reply) => {
    const { id } = req.params;
    const { status = 'resolved', notes } = req.body || {};
    
    if (!id) {
      return reply.status(400).send({ error: 'ID é obrigatório' });
    }
    
    if (!['resolved', 'ignored'].includes(status)) {
      return reply.status(400).send({ error: 'Status deve ser "resolved" ou "ignored"' });
    }
    
    const { rowCount } = await pool.query(`
      UPDATE manual_reviews 
      SET 
        status = $2,
        notes = COALESCE($3, notes),
        resolved_at = now()
      WHERE id = $1
    `, [id, status, notes || null]);
    
    if (rowCount === 0) {
      return reply.status(404).send({ error: 'Revisão não encontrada' });
    }
    
    reply.send({ 
      success: true,
      updated: rowCount,
      message: `Revisão marcada como ${status}`
    });
  });
  
  /**
   * GET /admin/bancas/reviews/stats
   * Estatísticas de revisões por banca e motivo
   */
  app.get('/admin/bancas/reviews/stats', async (req: any, reply) => {
    const { rows } = await pool.query(`
      SELECT 
        b.name AS banca_name,
        mr.reason,
        mr.status,
        COUNT(*) AS count
      FROM manual_reviews mr
      LEFT JOIN bancas b ON b.id = mr.banca_id
      GROUP BY b.name, mr.reason, mr.status
      ORDER BY count DESC
    `);
    
    reply.send({
      stats: rows
    });
  });
}
