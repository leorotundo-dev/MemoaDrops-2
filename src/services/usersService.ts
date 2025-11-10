import { pool } from '../db/connection.js';

export async function createUser(email: string, name?: string) {
  const { rows } = await pool.query('INSERT INTO users(email, name) VALUES ($1,$2) RETURNING id, email, name, created_at', [email, name||null]);
  return rows[0];
}

export async function getUser(id: string) {
  const { rows } = await pool.query('SELECT id, email, name, created_at FROM users WHERE id=$1', [id]);
  return rows[0] || null;
}
