
import { pool } from '../db/connection.js';

export type UserRow = {
  id: string;
  email: string;
  name?: string | null;
  created_at?: string | null;
};

export async function createUser(email: string, name?: string): Promise<UserRow> {
  const { rows } = await pool.query(
    'INSERT INTO users(email, name) VALUES ($1, $2) RETURNING *',
    [email, name]
  );
  return rows[0] as UserRow;
}

export async function getUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  return rows[0] as UserRow | undefined;
}

export async function getUserStats(userId: string): Promise<{
  total_decks: number;
  total_cards: number;
  cards_due_today: number;
  cards_reviewed_today: number;
  total_reviews: number;
  last_study_date: string | null;
}> {
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
      last_study_date: (r6[0]?.last_study_date as string | null) || null,
    } as {
      total_decks: number;
      total_cards: number;
      cards_due_today: number;
      cards_reviewed_today: number;
      total_reviews: number;
      last_study_date: string | null;
    };
  } finally {
    client.release();
  }
}
