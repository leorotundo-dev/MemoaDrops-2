import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';
import { authenticate } from '../middleware/authenticate.js';

export async function updateProfileController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional()
  }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  await pool.query('UPDATE users SET name=COALESCE($2,name), email=COALESCE($3,email) WHERE id=$1', [userId, body.data.name ?? null, body.data.email ?? null]);
  return { ok: true };
}

export async function updatePrefsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = z.object({
    language: z.string().optional(),
    theme: z.string().optional(),
    notifications: z.boolean().optional()
  }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  await pool.query(`INSERT INTO user_prefs(user_id, language, theme, notifications)
                    VALUES ($1,$2,$3,$4)
                    ON CONFLICT (user_id) DO UPDATE SET
                      language=COALESCE(EXCLUDED.language, user_prefs.language),
                      theme=COALESCE(EXCLUDED.theme, user_prefs.theme),
                      notifications=COALESCE(EXCLUDED.notifications, user_prefs.notifications),
                      updated_at=now()`, [userId, body.data.language ?? null, body.data.theme ?? null, body.data.notifications ?? null]);
  return { ok: true };
}

export async function exportMyDataController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const client = await (await import('../db/connection.js')).pool.connect();
  try {
    const data: any = {};
    const tables = ['users','decks','cards','reviews','notifications','refresh_tokens','email_verifications','password_resets','user_prefs'];
    for (const t of tables) {
      const { rows } = await client.query(`SELECT * FROM ${t} WHERE user_id = $1 OR (id = $1 AND '${t}'='users')`, [userId]);
      data[t] = rows;
    }
    reply.header('Content-Type', 'application/json');
    return { exported_at: new Date().toISOString(), data };
  } finally {
    client.release();
  }
}

export async function deleteMyAccountController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  await (await import('../db/connection.js')).pool.query('DELETE FROM users WHERE id=$1', [userId]);
  return { ok: true };
}
