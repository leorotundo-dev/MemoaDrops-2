
import { pool } from '../db/connection.js';
import { addCardEmbeddingJob } from '../queues/embeddingQueue.js';

export type CardRow = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  repetitions?: number | null;
  ease_factor?: number | null;
  interval?: number | null;
  next_review_date?: string | null;
  created_at?: string | null;
};

export async function createCard(
  deckId: string,
  front: string,
  back: string
): Promise<CardRow> {
  const { rows } = await pool.query(
    'INSERT INTO cards(deck_id, front, back, next_review_date) VALUES ($1,$2,$3,CURRENT_DATE) RETURNING *',
    [deckId, front, back]
  );
  const card = rows[0] as CardRow;
  await addCardEmbeddingJob(card.id);
  return card;
}

export async function getCardById(id: string): Promise<CardRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM cards WHERE id=$1', [id]);
  return rows[0] as CardRow | undefined;
}

export async function getCardsByDeck(deckId: string): Promise<CardRow[]> {
  const { rows } = await pool.query('SELECT * FROM cards WHERE deck_id=$1', [
    deckId,
  ]);
  return rows as CardRow[];
}

export async function deleteCard(id: string): Promise<void> {
  await pool.query('DELETE FROM cards WHERE id=$1', [id]);
}

export async function getCardsDue(deckId: string): Promise<CardRow[]> {
  const { rows } = await pool.query(
    `SELECT id, deck_id, front, back, repetitions, ease_factor, interval,
            next_review_date, created_at
     FROM cards
     WHERE deck_id = $1 AND next_review_date <= CURRENT_DATE
     ORDER BY next_review_date ASC`,
    [deckId]
  );
  return rows as CardRow[];
}
