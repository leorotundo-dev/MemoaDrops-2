
import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';
import { AppError } from '../errors/AppError.js';

export async function authorizeDeck(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const userId = (req as any).userId as string | undefined;
  const deckId = (req.params as any)?.id || (req.params as any)?.deckId || (req.body as any)?.deckId || (req.query as any)?.deckId;
  if (!userId || !deckId) {
    throw new AppError('Requisição inválida', 400);
  }
  const { rows } = await pool.query('SELECT user_id FROM decks WHERE id=$1', [deckId]);
  if (!rows[0]) throw new AppError('Recurso não encontrado', 404);
  if (rows[0].user_id !== userId) throw new AppError('Proibido', 403);
}

export async function authorizeCard(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const userId = (req as any).userId as string | undefined;
  const cardId = (req.params as any)?.id || (req.params as any)?.cardId || (req.body as any)?.cardId || (req.query as any)?.cardId;
  if (!userId || !cardId) {
    throw new AppError('Requisição inválida', 400);
  }
  const { rows } = await pool.query(
    `SELECT d.user_id
       FROM cards c
       JOIN decks d ON d.id = c.deck_id
      WHERE c.id = $1`,
    [cardId]
  );
  if (!rows[0]) throw new AppError('Recurso não encontrado', 404);
  if (rows[0].user_id !== userId) throw new AppError('Proibido', 403);
}
