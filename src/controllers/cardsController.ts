import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { createCard, getCardById, getCardsByDeck, deleteCard, getCardsDue, updateCard } from '../services/cardsService.js';

export async function createCardController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ deckId: z.string().uuid(), front: z.string(), back: z.string() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const card = await createCard(body.data.deckId, body.data.front, body.data.back);
  return card;
}

export async function getCardByIdController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const card = await getCardById(ps.data.id);
  if (!card) throw new AppError('Card não encontrado', 404);
  return card;
}

export async function getCardsByDeckController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ deckId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const cards = await getCardsByDeck(ps.data.deckId);
  return cards;
}

export async function getCardsDueController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ deckId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const cards = await getCardsDue(ps.data.deckId);
  return cards;
}

export async function updateCardController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const body = z.object({ front: z.string().optional(), back: z.string().optional() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const updated = await updateCard(ps.data.id, body.data);
  return updated;
}

export async function deleteCardController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  await deleteCard(ps.data.id);
  return { ok: true };
}
