import { pool } from '../db/connection.js';
import { AppError } from '../errors/AppError.js';

export async function createDeck(userId: string, title: string, description?: string|null) {
  const { rows } = await pool.query(
    'INSERT INTO decks(user_id, title, description) VALUES ($1,$2,$3) RETURNING *',
    [userId, title, description ?? null]
  );
  return rows[0];
}

export async function getDeckById(id: string) {
  const { rows } = await pool.query('SELECT * FROM decks WHERE id=$1', [id]);
  return rows[0];
}

export async function getDecksByUser(userId: string) {
  const { rows } = await pool.query('SELECT * FROM decks WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
  return rows;
}

export async function updateDeck(id: string, data: { title?: string; description?: string|null; is_public?: boolean }) {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (typeof data.title === 'string')       { sets.push(`title=$${i++}`);       vals.push(data.title); }
  if (typeof data.description !== 'undefined') { sets.push(`description=$${i++}`);  vals.push(data.description); }
  if (typeof data.is_public === 'boolean')  { sets.push(`is_public=$${i++}`);   vals.push(data.is_public); }
  if (!sets.length) throw new AppError('Nada para atualizar', 400);
  vals.push(id);
  const { rows } = await pool.query(`UPDATE decks SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals);
  if (!rows[0]) throw new AppError('Deck não encontrado', 404);
  return rows[0];
}

export async function deleteDeck(id: string) {
  await pool.query('DELETE FROM decks WHERE id=$1', [id]);
}

export async function listPublicDecks(limit = 100) {
  const { rows } = await pool.query('SELECT id, user_id, title, description, created_at FROM decks WHERE is_public = true ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}

export async function cloneDeck(sourceDeckId: string, newOwnerId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: d } = await client.query('SELECT id, title, description FROM decks WHERE id=$1', [sourceDeckId]);
    if (!d[0]) throw new AppError('Deck origem não encontrado', 404);
    const base = d[0];
    const { rows: created } = await client.query(
      'INSERT INTO decks(user_id, title, description) VALUES ($1,$2,$3) RETURNING id',
      [newOwnerId, `${base.title} (cópia)`, base.description]
    );
    const newDeckId = created[0].id;
    const { rows: cards } = await client.query('SELECT front, back FROM cards WHERE deck_id=$1', [sourceDeckId]);
    for (const c of cards) {
      await client.query('INSERT INTO cards(deck_id, front, back) VALUES ($1,$2,$3)', [newDeckId, c.front, c.back]);
    }
    await client.query('COMMIT');
    return { newDeckId, cardsCopied: cards.length };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
