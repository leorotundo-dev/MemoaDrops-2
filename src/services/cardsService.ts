import { pool } from '../db/connection.js';
import { AppError } from '../errors/AppError.js';

export async function createCard(deckId: string, front: string, back: string) {
  const { rows } = await pool.query(
    'INSERT INTO cards(deck_id, front, back) VALUES ($1,$2,$3) RETURNING *',
    [deckId, front, back]
  );
  return rows[0];
}

export async function getCardById(id: string) {
  const { rows } = await pool.query('SELECT * FROM cards WHERE id=$1', [id]);
  return rows[0];
}

export async function getCardsByDeck(deckId: string) {
  const { rows } = await pool.query('SELECT * FROM cards WHERE deck_id=$1', [deckId]);
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

export async function updateCard(id: string, data: { front?: string; back?: string }) {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (typeof data.front === 'string') { sets.push(`front=$${i++}`); vals.push(data.front); }
  if (typeof data.back === 'string')  { sets.push(`back=$${i++}`);  vals.push(data.back); }
  if (!sets.length) throw new AppError('Nada para atualizar', 400);
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE cards SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`,
    vals
  );
  if (!rows[0]) throw new AppError('Card não encontrado', 404);
  return rows[0];
}

export async function deleteCard(id: string) {
  await pool.query('DELETE FROM cards WHERE id=$1', [id]);
}
