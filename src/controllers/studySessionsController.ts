import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { startSession, finishSession } from '../services/studySessionsService.js';

export async function startSessionController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ userId: z.string().uuid(), deckId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const s = await startSession(parsed.data.userId, parsed.data.deckId);
  return reply.code(201).send(s);
}

export async function finishSessionController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const s = await finishSession(parsed.data.id);
  if (!s) return reply.code(404).send({ error: 'not_found' });
  return s;
}
