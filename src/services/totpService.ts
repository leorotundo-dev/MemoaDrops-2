import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { pool } from '../db/connection.js';

export async function createTotpSecret(userId: string){
  const secret = speakeasy.generateSecret({ length: 20, name: `MemoDrops:${userId}` });
  await pool.query(`INSERT INTO user_mfa_totp(user_id, secret, enabled)
                    VALUES ($1,$2,false)
                    ON CONFLICT (user_id) DO UPDATE SET secret=$2, enabled=false, updated_at=now()`,
                   [userId, secret.base32]);
  const otpauth = secret.otpauth_url!;
  const dataUrl = await qrcode.toDataURL(otpauth);
  return { base32: secret.base32, otpauth, qr: dataUrl };
}

export async function enableTotp(userId: string, token: string){
  const { rows } = await pool.query('SELECT secret FROM user_mfa_totp WHERE user_id=$1', [userId]);
  if (!rows[0]) return false;
  const ok = speakeasy.totp.verify({ secret: rows[0].secret, encoding: 'base32', token, window: 1 });
  if (ok) await pool.query('UPDATE user_mfa_totp SET enabled=true, updated_at=now() WHERE user_id=$1', [userId]);
  return ok;
}

export async function verifyTotp(userId: string, token: string){
  const { rows } = await pool.query('SELECT secret, enabled FROM user_mfa_totp WHERE user_id=$1', [userId]);
  if (!rows[0] || !rows[0].enabled) return false;
  return speakeasy.totp.verify({ secret: rows[0].secret, encoding: 'base32', token, window: 1 });
}
