import { pool } from '../db/connection.js';
import crypto from 'node:crypto';
import { addMinutes } from '../utils/time.js';

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = addMinutes(new Date(), 60*24*30); // 30 dias
  await pool.query('INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES ($1,$2,$3)', [userId, token, expires.toISOString()]);
  return { token, expiresAt: expires.toISOString() };
}
export async function rotateRefreshToken(oldToken: string) {
  const { rows } = await pool.query('SELECT user_id FROM refresh_tokens WHERE token=$1 AND revoked_at IS NULL AND expires_at>now()', [oldToken]);
  if (!rows[0]) return null;
  await pool.query('UPDATE refresh_tokens SET revoked_at=now() WHERE token=$1', [oldToken]);
  return createRefreshToken(rows[0].user_id);
}
export async function createVerifyEmailCode(userId: string) {
  const code = crypto.randomBytes(3).toString('hex');
  await pool.query('INSERT INTO email_verifications(user_id, code) VALUES ($1,$2)', [userId, code]);
  return code;
}
export async function verifyEmailCode(userId: string, code: string) {
  const { rows } = await pool.query('SELECT id FROM email_verifications WHERE user_id=$1 AND code=$2 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1', [userId, code]);
  if (!rows[0]) return false;
  await pool.query('UPDATE email_verifications SET used_at=now() WHERE id=$1', [rows[0].id]);
  await pool.query('UPDATE users SET email_verified=true WHERE id=$1', [userId]);
  return true;
}
export async function createPasswordResetCode(userId: string) {
  const code = crypto.randomBytes(3).toString('hex');
  await pool.query('INSERT INTO password_resets(user_id, code) VALUES ($1,$2)', [userId, code]);
  return code;
}
export async function consumePasswordResetCode(userId: string, code: string) {
  const { rows } = await pool.query('SELECT id FROM password_resets WHERE user_id=$1 AND code=$2 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1', [userId, code]);
  if (!rows[0]) return false;
  await pool.query('UPDATE password_resets SET used_at=now() WHERE id=$1', [rows[0].id]);
  return true;
}
