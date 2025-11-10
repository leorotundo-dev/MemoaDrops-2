import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';
import { AppError } from '../errors/AppError.js';

const PatchSchema = z.object({
  push_enabled: z.boolean().optional(),
  study_reminders: z.boolean().optional(),
  news_updates: z.boolean().optional(),
  marketing_optin: z.boolean().optional(),
  timezone: z.string().optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function getMyNotificationPrefsController(req: FastifyRequest, reply: FastifyReply){
  const userId = (req as any).userId as string;
  if (!userId) throw new AppError('unauthorized', 401);
  const { rows } = await pool.query('SELECT * FROM user_preferences WHERE user_id=$1', [userId]);
  if (rows[0]) return rows[0];
  const ins = await pool.query('INSERT INTO user_preferences(user_id) VALUES ($1) RETURNING *', [userId]);
  return ins.rows[0];
}

export async function updateMyNotificationPrefsController(req: FastifyRequest, reply: FastifyReply){
  const userId = (req as any).userId as string;
  if (!userId) throw new AppError('unauthorized', 401);
  const body = PatchSchema.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });

  const fields = body.data;
  const setClauses = Object.keys(fields).map((k, i) => `${k}=$${i+2}`);
  const values = Object.values(fields);
  if (setClauses.length === 0) return reply.code(400).send({ error: 'empty_update' });

  const upsert = `
    INSERT INTO user_preferences (user_id, ${Object.keys(fields).join(', ')})
    VALUES ($1, ${values.map((_,i)=>'$'+(i+2)).join(', ')})
    ON CONFLICT (user_id) DO UPDATE SET ${setClauses.join(', ')}
    RETURNING *
  `;
  const { rows } = await pool.query(upsert, [userId, ...values]);
  return rows[0];
}
