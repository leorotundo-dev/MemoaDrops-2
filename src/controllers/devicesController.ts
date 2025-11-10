import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';

export async function registerDeviceController(req: FastifyRequest, reply: FastifyReply){
  const userId = (req as any).userId as string;
  const body = z.object({ token: z.string().min(8), platform: z.enum(['ios','android','web']).default('web') }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  await pool.query(`INSERT INTO user_devices(user_id, token, platform)
                    VALUES ($1,$2,$3)
                    ON CONFLICT (token) DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform, updated_at=now()`,
                    [userId, body.data.token, body.data.platform]);
  return { ok: true };
}
