import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createTotpSecret, enableTotp, verifyTotp } from '../services/totpService.js';

export async function totpSetupController(req: FastifyRequest, reply: FastifyReply){
  const userId = (req as any).userId as string;
  const out = await createTotpSecret(userId);
  return out;
}
export async function totpEnableController(req: FastifyRequest, reply: FastifyReply){
  const userId = (req as any).userId as string;
  const body = z.object({ token: z.string().min(6).max(8) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const ok = await enableTotp(userId, body.data.token);
  return ok ? { ok: true } : reply.code(400).send({ error: 'invalid_token' });
}
export async function totpLoginController(req: FastifyRequest, reply: FastifyReply){
  const userId = (req as any).userId as string; // assumindo 1º fator válido
  const body = z.object({ token: z.string().min(6).max(8) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const ok = await verifyTotp(userId, body.data.token);
  return ok ? { ok: true } : reply.code(400).send({ error: 'invalid_token' });
}
