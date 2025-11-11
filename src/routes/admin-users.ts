import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

export async function registerAdminUserRoutes(app: FastifyInstance) {
  // Lista com filtros e paginação
  app.get('/admin/users', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { q, plan, status, page = '1', pageSize = '20' } = (req.query || {}) as any;
    const p = Number(page) || 1;
    const ps = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const where: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (q) { where.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`); values.push(`%${q}%`); idx++; }
    if (plan && plan !== 'all') { where.push(`COALESCE(u.plan,'free') = $${idx}`); values.push(plan); idx++; }
    if (status && status !== 'all') {
      if (status === 'banned') where.push(`u.is_banned = true`);
      if (status === 'active') where.push(`COALESCE(u.is_banned,false) = false`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT u.id, u.name, u.email, u.plan, COALESCE(u.cash,0) AS cash, COALESCE(u.is_banned,false) AS is_banned, u.last_login_at
                 FROM users u ${whereSql}
                 ORDER BY u.created_at DESC
                 LIMIT ${ps} OFFSET ${(p-1)*ps}`;
    const { rows } = await pool.query(sql, values);
    return { items: rows, page: p, pageSize: ps };
  });

  app.get('/admin/users/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    const { rows } = await pool.query(
      'SELECT id, name, email, plan, COALESCE(cash,0) AS cash, COALESCE(is_banned,false) AS is_banned, last_login_at FROM users WHERE id=$1',
      [id]
    );
    if (!rows[0]) return reply.status(404).send({ error: 'User not found' });
    return rows[0];
  });

  app.put('/admin/users/:id', { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body || {}) as any;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const key of ['name','email','plan','cash','is_banned']) {
      if (body[key] !== undefined) { fields.push(`${key} = $${idx}`); values.push(body[key]); idx++; }
    }
    if (!fields.length) return reply.status(400).send({ error: 'No fields to update' });
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id,name,email,plan,cash,is_banned,last_login_at`;
    const { rows } = await pool.query(sql, values);
    return rows[0];
  });

  app.post('/admin/users/:id/add-cash', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    const { amount } = (req.body || {}) as any;
    if (!amount || Number(amount) <= 0) return reply.status(400).send({ error: 'Invalid amount' });
    await pool.query('UPDATE users SET cash = COALESCE(cash,0) + $1, updated_at = NOW() WHERE id=$2', [Number(amount), id]);
    return { message: 'Credits added' };
  });

  app.post('/admin/users/:id/ban', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    await pool.query('UPDATE users SET is_banned = true, banned_at = NOW() WHERE id=$1', [id]);
    return { message: 'User banned' };
  });

  app.post('/admin/users/:id/unban', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    await pool.query('UPDATE users SET is_banned = false, banned_at = NULL WHERE id=$1', [id]);
    return { message: 'User unbanned' };
  });

  app.get('/admin/users/:id/stats', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const decks = await pool.query('SELECT COUNT(*)::int AS c FROM decks WHERE user_id=$1', [id]);
      const cards = await pool.query('SELECT COUNT(*)::int AS c FROM cards c JOIN decks d ON c.deck_id=d.id WHERE d.user_id=$1', [id]);
      const sessions = await pool.query('SELECT COUNT(*)::int AS c FROM study_sessions WHERE user_id=$1', [id]);
      const streak = await pool.query('SELECT COALESCE(MAX(streak_days),0)::int AS c FROM study_sessions WHERE user_id=$1', [id]);
      const engagement = await pool.query(`
        SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS cards
        FROM study_sessions WHERE user_id=$1
        AND started_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC
      `, [id]);
      return {
        decks: decks.rows[0]?.c ?? 0,
        cards: cards.rows[0]?.c ?? 0,
        sessions: sessions.rows[0]?.c ?? 0,
        avg_streak: streak.rows[0]?.c ?? 0,
        engagement: engagement.rows
      };
    } catch (e) {
      // Fallback se tabelas não existirem
      return { decks: 0, cards: 0, sessions: 0, avg_streak: 0, engagement: [] };
    }
  });

  app.get('/admin/users/:id/engagement', { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const engagement = await pool.query(`
        SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS cards
        FROM study_sessions WHERE user_id=$1
        AND started_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC
      `, [id]);
      return engagement.rows;
    } catch { return []; }
  });

  app.get('/admin/users/:id/activity', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const { rows } = await pool.query(
        `SELECT id, action, COALESCE(details,'{}'::jsonb) AS meta, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
           FROM user_activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [id]
      );
      return rows.map(r => ({ id: r.id, action: r.action, created_at: r.created_at, meta: r.meta }));
    } catch {
      // Fallback simples
      return [];
    }
  });
}
