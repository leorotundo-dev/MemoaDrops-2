import { pool } from '../db/connection.js';

export async function createDeck(userId: string, title: string, description?: string) {
  const { rows } = await pool.query(
    'INSERT INTO decks(user_id, title, description) VALUES ($1,$2,$3) RETURNING id, user_id, title, description, created_at',
    [userId, title, description||null]
  );
  return rows[0];
}

export async function getDeck(id: string) {
  const { rows } = await pool.query('SELECT id, user_id, title, description, created_at FROM decks WHERE id=$1', [id]);
  return rows[0] || null;
}

export async function listDecksByUser(userId: string) {
  const { rows } = await pool.query('SELECT id, title, description, created_at FROM decks WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
  return rows;
}

export async function deleteDeck(id: string) {
  await pool.query('DELETE FROM decks WHERE id=$1', [id]);
  return { ok: true };
}
