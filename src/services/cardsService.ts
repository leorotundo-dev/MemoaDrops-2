import { pool } from '../db/connection.js';
import { addCardEmbeddingJob } from '../queues/embeddingQueue.js';

export async function createCard(deckId: string, front: string, back: string) {
  const { rows } = await pool.query(
    'INSERT INTO cards(deck_id, front, back, next_review_date) VALUES ($1,$2,$3, CURRENT_DATE) RETURNING id, deck_id, front, back, next_review_date',
    [deckId, front, back]
  );
  const card = rows[0];
  await addCardEmbeddingJob(card.id);
  return card;
}

export async function getCard(id: string) {
  const { rows } = await pool.query('SELECT id, deck_id, front, back, repetitions, ease_factor, interval, next_review_date FROM cards WHERE id=$1', [id]);
  return rows[0] || null;
}

export async function listCardsByDeck(deckId: string) {
  const { rows } = await pool.query('SELECT id, front, back, next_review_date FROM cards WHERE deck_id=$1 ORDER BY created_at DESC', [deckId]);
  return rows;
}

export async function getCardsDue(deckId: string) {
  const { rows } = await pool.query(
    `SELECT id, deck_id, front, back, repetitions, ease_factor, interval, next_review_date, created_at
     FROM cards 
     WHERE deck_id = $1 AND next_review_date <= CURRENT_DATE
     ORDER BY next_review_date ASC`,
    [deckId]
  );
  return rows;
}

export async function deleteCard(id: string) {
  await pool.query('DELETE FROM cards WHERE id=$1', [id]);
  return { ok: true };
}
