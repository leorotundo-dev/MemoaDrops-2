import { pool } from '../db/connection.js';

export async function startSession(userId: string, deckId: string) {
  const { rows } = await pool.query(
    'INSERT INTO study_sessions(user_id, deck_id) VALUES ($1,$2) RETURNING id, user_id, deck_id, started_at',
    [userId, deckId]
  );
  return rows[0];
}

export async function finishSession(sessionId: string) {
  const { rows } = await pool.query(
    'UPDATE study_sessions SET finished_at = now() WHERE id=$1 RETURNING id, user_id, deck_id, started_at, finished_at',
    [sessionId]
  );
  return rows[0] || null;
}
