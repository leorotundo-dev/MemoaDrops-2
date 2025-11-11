// Novo endpoint /admin/stats com tratamento de erro robusto
import type { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export async function adminStatsRoute(app: FastifyInstance) {
  app.get('/admin/stats', async () => {
    const stats = {
      users: { total: 0, active_dau: 0, active_mau: 0 },
      finance: { mrr: 0, total_cost: 0, costs_by_category: {}, costs_by_service: [] },
      content: { contests: 0, subjects: 0, public_decks: 0, public_cards: 0 },
      system: { api_status: 'healthy', db_status: 'healthy', active_jobs: 0, failed_jobs: 0 }
    };

    // Usuários
    try {
      const { rows: [usersCount] } = await pool.query('SELECT COUNT(*)::int AS total FROM users');
      stats.users.total = usersCount?.total || 0;
    } catch (e) {
      console.error('Error counting users:', e);
    }

    // DAU/MAU
    try {
      const { rows: [activeDAU] } = await pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS active_dau 
        FROM study_sessions 
        WHERE session_date >= NOW() - INTERVAL '1 day'
      `);
      stats.users.active_dau = activeDAU?.active_dau || 0;

      const { rows: [activeMAU] } = await pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS active_mau 
        FROM study_sessions 
        WHERE session_date >= NOW() - INTERVAL '30 days'
      `);
      stats.users.active_mau = activeMAU?.active_mau || 0;
    } catch (e) {
      // Tabela study_sessions não existe ainda
    }

    // Custos
    try {
      const { rows: costsByCategory } = await pool.query(`
        SELECT category, SUM(amount)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY category
      `);
      
      stats.finance.costs_by_category = costsByCategory.reduce((acc: any, row: any) => {
        acc[row.category] = parseFloat(row.total);
        return acc;
      }, {});

      const { rows: costsByService } = await pool.query(`
        SELECT service, category, SUM(amount)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY service, category
        ORDER BY total DESC
      `);
      
      stats.finance.costs_by_service = costsByService.map((row: any) => ({
        service: row.service,
        category: row.category,
        total: parseFloat(row.total)
      }));

      const { rows: [totalCostRow] } = await pool.query(`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      stats.finance.total_cost = parseFloat(totalCostRow?.total || '0');
    } catch (e) {
      console.error('Error fetching costs:', e);
    }

    // Conteúdo
    try {
      const { rows: [contests] } = await pool.query('SELECT COUNT(*)::int AS contests FROM concursos');
      stats.content.contests = contests?.contests || 0;
    } catch (e) {
      // Tabela concursos não existe
    }

    try {
      const { rows: [subjects] } = await pool.query('SELECT COUNT(*)::int AS subjects FROM materias');
      stats.content.subjects = subjects?.subjects || 0;
    } catch (e) {
      // Tabela materias não existe
    }

    try {
      const { rows: [publicDecks] } = await pool.query('SELECT COUNT(*)::int AS public_decks FROM decks WHERE is_public = true');
      stats.content.public_decks = publicDecks?.public_decks || 0;

      const { rows: [publicCards] } = await pool.query(`
        SELECT COUNT(*)::int AS public_cards 
        FROM cards c 
        JOIN decks d ON c.deck_id = d.id 
        WHERE d.is_public = true
      `);
      stats.content.public_cards = publicCards?.public_cards || 0;
    } catch (e) {
      // Tabelas decks/cards não existem
    }

    // Sistema - Jobs
    try {
      const { rows: [activeJobs] } = await pool.query(`
        SELECT COUNT(*)::int AS active_jobs 
        FROM jobs 
        WHERE status IN ('active', 'waiting')
      `);
      stats.system.active_jobs = activeJobs?.active_jobs || 0;

      const { rows: [failedJobs] } = await pool.query(`
        SELECT COUNT(*)::int AS failed_jobs 
        FROM jobs 
        WHERE status = 'failed'
      `);
      stats.system.failed_jobs = failedJobs?.failed_jobs || 0;
    } catch (e) {
      // Tabela jobs não existe
    }

    // Testar conexão com DB
    try {
      await pool.query('SELECT 1');
      stats.system.db_status = 'healthy';
    } catch (e) {
      stats.system.db_status = 'error';
    }

    return stats;
  });
}
