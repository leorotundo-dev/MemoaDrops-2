
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { register, login, getUserById } from '../services/authService.js';
import { AppError } from '../errors/AppError.js';

export async function registerController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional()
  }).safeParse(req.body);

  if (!body.success) {
    return reply.code(400).send({ error: body.error.issues });
  }
  const result = await register(body.data.email, body.data.password, body.data.name);
  return reply.code(201).send(result);
}

export async function loginController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({
    email: z.string().email(),
    password: z.string()
  }).safeParse(req.body);

  if (!body.success) {
    return reply.code(400).send({ error: body.error.issues });
  }
  const result = await login(body.data.email, body.data.password);
  return reply.send(result);
}

export async function meController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string | undefined;
  if (!userId) {
    throw new AppError('Não autenticado', 401);
  }
  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }
  return reply.send({ user });
}
