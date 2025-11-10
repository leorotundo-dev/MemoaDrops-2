import { pool } from '../db/connection.js';

export async function createUser(email: string, name?: string) {
  const { rows } = await pool.query('INSERT INTO users(email, name) VALUES ($1,$2) RETURNING id, email, name, created_at', [email, name||null]);
  return rows[0];
}

export async function getUser(id: string) {
  const { rows } = await pool.query('SELECT id, email, name, created_at FROM users WHERE id=$1', [id]);
  return rows[0] || null;
}

export async function getUserStats(userId: string) {
  const client = await pool.connect();
  try {
    const { rows: r1 } = await client.query(
      'SELECT COUNT(*)::int AS total_decks FROM decks WHERE user_id = $1',
      [userId]
    );
    
    const { rows: r2 } = await client.query(
      'SELECT COUNT(*)::int AS total_cards FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = $1)',
      [userId]
    );
    
    const { rows: r3 } = await client.query(
      'SELECT COUNT(*)::int AS cards_due_today FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = $1) AND next_review_date <= CURRENT_DATE',
      [userId]
    );
    
    const { rows: r4 } = await client.query(
      'SELECT COUNT(*)::int AS cards_reviewed_today FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = $1)) AND DATE(reviewed_at) = CURRENT_DATE',
      [userId]
    );
    
    const { rows: r5 } = await client.query(
      'SELECT COUNT(*)::int AS total_reviews FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = $1))',
      [userId]
    );
    
    const { rows: r6 } = await client.query(
      'SELECT MAX(DATE(reviewed_at)) AS last_study_date FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = $1))',
      [userId]
    );
    
    return {
      ...r1[0],
      ...r2[0],
      ...r3[0],
      ...r4[0],
      ...r5[0],
      last_study_date: r6[0]?.last_study_date || null
    };
  } finally {
    client.release();
  }
}
