
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createUser, getUserById, getUserStats } from '../services/usersService.js';

export async function createUserController(req: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({ email: z.string().email(), name: z.string().optional() })
    .safeParse(req.body);

  if (!body.success) {
    return reply.code(400).send({ error: body.error.issues });
  }
  const user = await createUser(body.data.email, body.data.name);
  return user;
}

export async function getUserByIdController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) {
    return reply.code(400).send({ error: ps.error.issues });
  }
  const user = await getUserById(ps.data.id);
  return user;
}

export async function getUserStatsController(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const ps = z.object({ userId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) {
    return reply.code(400).send({ error: ps.error.issues });
  }
  const stats = await getUserStats(ps.data.userId);
  return stats;
}
