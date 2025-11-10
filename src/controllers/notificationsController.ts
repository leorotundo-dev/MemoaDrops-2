import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createNotification, listNotifications } from '../services/notificationsService.js';

export async function createNotificationController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = z.object({
    type: z.string().min(1),
    scheduleAt: z.string().datetime(),
    payload: z.any().optional()
  }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const n = await createNotification({ userId, type: body.data.type, scheduleAt: body.data.scheduleAt, payload: body.data.payload ?? null });
  return n;
}

export async function listMyNotificationsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const n = await listNotifications(userId, 100);
  return n;
}
