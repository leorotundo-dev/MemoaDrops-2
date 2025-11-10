import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { reviewCard } from '../services/reviewsService.js';

export async function reviewCardController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  const body = z.object({ rating: z.number().int().min(0).max(5) }).safeParse(req.body);
  if (!ps.success || !body.success) return reply.code(400).send({ error: [ps.error?.issues, body.error?.issues] });
  const r = await reviewCard(ps.data.id, body.data.rating as 0|1|2|3|4|5);
  return r;
}
