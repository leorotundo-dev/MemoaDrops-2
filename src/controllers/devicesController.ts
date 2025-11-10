import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';
import { AppError } from '../errors/AppError.js';

const Body = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios','android','web']),
  deviceModel: z.string().optional(),
  appVersion: z.string().optional(),
});

export async function registerDeviceController(req: FastifyRequest, reply: FastifyReply){
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const userId = (req as any).userId as string;
  if (!userId) throw new AppError('unauthorized', 401);

  const { token, platform, deviceModel, appVersion } = parsed.data;
  const q = `
    INSERT INTO user_devices (user_id, token, platform, device_model, app_version)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (user_id, token) DO UPDATE
      SET platform=EXCLUDED.platform,
          device_model=COALESCE(EXCLUDED.device_model, user_devices.device_model),
          app_version=COALESCE(EXCLUDED.app_version, user_devices.app_version),
          last_seen=now()
    RETURNING id, user_id, token, platform, device_model, app_version, last_seen
  `;
  const { rows } = await pool.query(q, [userId, token, platform, deviceModel || null, appVersion || null]);
  return reply.code(200).send(rows[0]);
}
