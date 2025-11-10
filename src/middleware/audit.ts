import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';

export async function auditLog(req: FastifyRequest, _reply: FastifyReply) {
  const userId = (req as any).userId ?? null;
  const action = `${req.method} ${(req as any).routeOptions?.url || req.url}`;
  const meta = { ip: req.ip, ua: req.headers['user-agent'] };
  await pool.query('INSERT INTO audit_logs(user_id, action, meta) VALUES ($1,$2,$3)', [userId, action, JSON.stringify(meta)]);
}
