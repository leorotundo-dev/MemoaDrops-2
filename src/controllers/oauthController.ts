import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { loginWithGoogleIdToken, loginWithAppleIdToken } from '../services/oauthService.js';

export async function oauthGoogleController(req: FastifyRequest, reply: FastifyReply){
  const body = z.object({ idToken: z.string().min(10) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const out = await loginWithGoogleIdToken(body.data.idToken);
  return reply.code(200).send(out);
}

export async function oauthAppleController(req: FastifyRequest, reply: FastifyReply){
  const body = z.object({ idToken: z.string().min(10) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const out = await loginWithAppleIdToken(body.data.idToken);
  return reply.code(200).send(out);
}
