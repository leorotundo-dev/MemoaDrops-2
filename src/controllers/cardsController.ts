import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createCard, getCard, listCardsByDeck, deleteCard } from '../services/cardsService.js';

export async function createCardController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ deckId: z.string().uuid(), front: z.string().min(1), back: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const c = await createCard(parsed.data.deckId, parsed.data.front, parsed.data.back);
  return reply.code(201).send(c);
}

export async function getCardController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const c = await getCard(parsed.data.id);
  if (!c) return reply.code(404).send({ error: 'not_found' });
  return c;
}

export async function listCardsByDeckController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ deckId: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const list = await listCardsByDeck(parsed.data.deckId);
  return list;
}

export async function deleteCardController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  await deleteCard(parsed.data.id);
  return reply.code(204).send();
}
