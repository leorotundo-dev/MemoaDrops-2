import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { createDeck, getDeckById, getDecksByUser, deleteDeck, updateDeck, listPublicDecks, cloneDeck } from '../services/decksService.js';

export async function createDeckController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ title: z.string().min(1), description: z.string().optional() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const userId = (req as any).userId as string;
  const deck = await createDeck(userId, body.data.title, body.data.description);
  return deck;
}

export async function getDeckByIdController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const deck = await getDeckById(ps.data.id);
  if (!deck) throw new AppError('Deck não encontrado', 404);
  return deck;
}

export async function getDecksByUserController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ userId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const authUser = (req as any).userId as string;
  if (authUser !== ps.data.userId) throw new AppError('Acesso negado', 403);
  const decks = await getDecksByUser(ps.data.userId);
  return decks;
}

export async function updateDeckController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const body = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    is_public: z.boolean().optional()
  }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const deck = await updateDeck(ps.data.id, body.data);
  return deck;
}

export async function deleteDeckController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  await deleteDeck(ps.data.id);
  return { ok: true };
}

export async function listPublicDecksController(req: FastifyRequest, reply: FastifyReply) {
  const qs = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).safeParse((req as any).query);
  const decks = await listPublicDecks(qs.success ? qs.data.limit : 100);
  return decks;
}

export async function cloneDeckController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ id: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const userId = (req as any).userId as string;
  const out = await cloneDeck(ps.data.id, userId);
  return out;
}
