import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createUser, getUser } from '../services/usersService.js';

export async function createUserController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ email: z.string().email(), name: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const u = await createUser(parsed.data.email, parsed.data.name);
  return reply.code(201).send(u);
}

export async function getUserController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const u = await getUser(parsed.data.id);
  if (!u) return reply.code(404).send({ error: 'not_found' });
  return u;
}
