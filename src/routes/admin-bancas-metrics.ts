import type { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

/**
 * Rotas admin para métricas e alertas de scraping
 * Monitora performance, erros e bloqueios por domínio
 */
export async function registerAdminBancasMetrics(app: FastifyInstance) {
  
  /**
   * GET /admin/bancas/metrics
   * Métricas detalhadas por domínio e janela de tempo
   */
  app.get('/admin/bancas/metrics', async (req: any, reply) => {
    const { from, to, domain } = req.query || {};
    
    const args: any[] = [];
    let where = 'WHERE 1=1';
    
    if (from) {
      args.push(from);
      where += ` AND window_start >= $${args.length}`;
    }
    
    if (to) {
      args.push(to);
      where += ` AND window_start < $${args.length}`;
    }
    
    if (domain) {
      args.push(domain);
      where += ` AND domain = $${args.length}`;
    }
    
    const { rows } = await pool.query(`
      SELECT 
        domain,
        window_start,
        ok_count,
        err_4xx_count,
        err_5xx_count,
        blocked_count,
        bytes_downloaded,
        requests_total,
        cache_hits,
        ROUND(100.0 * cache_hits / NULLIF(requests_total, 0), 2) AS cache_hit_rate
      FROM domain_counters
      ${where}
      ORDER BY window_start DESC, domain ASC
      LIMIT 500
    `, args);
    
    reply.send({
      total: rows.length,
      metrics: rows
    });
  });
  
  /**
   * GET /admin/bancas/metrics/summary
   * Resumo agregado das últimas 24h
   */
  app.get('/admin/bancas/metrics/summary', async (req: any, reply) => {
    const { rows } = await pool.query(`
      SELECT * FROM v_domain_alerts
      ORDER BY total_blocked DESC, total_requests DESC
      LIMIT 100
    `);
    
    reply.send({
      summary: rows,
      period: '24h'
    });
  });
  
  /**
   * GET /admin/bancas/metrics/alerts
   * Domínios com alta taxa de bloqueio ou erro
   */
  app.get('/admin/bancas/metrics/alerts', async (req: any, reply) => {
    const { rows } = await pool.query(`
      SELECT 
        domain,
        total_requests,
        total_blocked,
        total_4xx,
        total_5xx,
        ROUND(100.0 * total_blocked / NULLIF(total_requests, 0), 2) AS block_rate,
        ROUND(100.0 * (total_4xx + total_5xx) / NULLIF(total_requests, 0), 2) AS error_rate,
        last_activity
      FROM v_domain_alerts
      WHERE 
        (total_blocked > 0 OR total_4xx + total_5xx > 0)
        AND total_requests > 5
      ORDER BY block_rate DESC, error_rate DESC
      LIMIT 50
    `);
    
    const alerts = rows.map(r => ({
      ...r,
      severity: r.block_rate > 50 ? 'critical' : r.block_rate > 20 ? 'warning' : 'info'
    }));
    
    reply.send({
      alerts,
      total: alerts.length
    });
  });
}
