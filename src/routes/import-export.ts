import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';
import { pool } from '../db/connection.js';

export async function importExportRoutes(app: FastifyInstance) {
  app.post('/import/csv', { preHandler: [authenticate] }, async (req, reply) => {
    const body = z.object({ deckId: z.string().uuid(), rows: z.array(z.object({ front: z.string(), back: z.string() })) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of body.data.rows) {
        await client.query('INSERT INTO cards(deck_id, front, back) VALUES ($1,$2,$3)', [body.data.deckId, r.front, r.back]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally { client.release(); }
    return { ok: true };
  });

  app.get('/export/decks/:deckId', { preHandler: [authenticate] }, async (req, reply) => {
    const deckId = (req.params as any).deckId as string;
    const { rows: cards } = await pool.query('SELECT front, back FROM cards WHERE deck_id=$1', [deckId]);
    reply.header('Content-Type','application/json');
    return { deckId, cards };
  });
}
