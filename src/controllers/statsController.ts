import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';

export async function deckStatsController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ deckId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN next_review_date <= CURRENT_DATE THEN 1 ELSE 0 END)::int AS due,
      ROUND(AVG(ease_factor)::numeric,2) AS avg_ef
    FROM cards WHERE deck_id=$1
  `,[ps.data.deckId]);
  const { rows: acc } = await pool.query(`
    SELECT rating, COUNT(*)::int AS n
    FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id=$1)
    GROUP BY rating ORDER BY rating
  `,[ps.data.deckId]);
  return { ...rows[0], distribution: acc };
}

export async function heatmapController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ userId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const { rows } = await pool.query(`
    SELECT DATE(reviewed_at) AS day, COUNT(*)::int AS reviews
    FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id=$1))
    GROUP BY DATE(reviewed_at) ORDER BY DATE(reviewed_at) DESC LIMIT 365
  `,[ps.data.userId]);
  return rows;
}

export async function searchCardsController(req: FastifyRequest, reply: FastifyReply) {
  const q = (req.query as any)?.q as string || '';
  const { rows } = await pool.query(`
    SELECT c.id, c.deck_id, c.front, c.back
    FROM cards c
    WHERE to_tsvector('portuguese', coalesce(c.front,'') || ' ' || coalesce(c.back,'')) @@ plainto_tsquery('portuguese', $1)
    ORDER BY c.created_at DESC
    LIMIT 100
  `,[q]);
  return rows;
}
