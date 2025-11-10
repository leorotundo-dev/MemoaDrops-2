import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createDeck, getDeck, listDecksByUser, deleteDeck } from '../services/decksService.js';
import { searchInDeck } from '../services/vectorSearchService.js';

export async function createDeckController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ userId: z.string().uuid(), title: z.string().min(1), description: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const d = await createDeck(parsed.data.userId, parsed.data.title, parsed.data.description);
  return reply.code(201).send(d);
}

export async function getDeckController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const d = await getDeck(parsed.data.id);
  if (!d) return reply.code(404).send({ error: 'not_found' });
  return d;
}

export async function listDecksByUserController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ userId: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  const list = await listDecksByUser(parsed.data.userId);
  return list;
}

export async function deleteDeckController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
  await deleteDeck(parsed.data.id);
  return reply.code(204).send();
}

export async function deckSemanticSearchController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ deckId: z.string().uuid() }).safeParse(req.params);
  const qs = z.object({ q: z.string().min(1).max(200) }).safeParse(req.query);
  if (!ps.success || !qs.success) return reply.code(400).send({ error: [ps.error?.issues, qs.error?.issues] });
  const rows = await searchInDeck(ps.data.deckId, qs.data.q);
  return rows;
}
