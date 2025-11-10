import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
// @ts-ignore
import jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';
import { pool } from '../db/connection.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../errors/AppError.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function loginWithGoogleIdToken(idToken: string){
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload) throw new AppError('invalid_google_token', 401);
  const sub = payload['sub'] as string;
  const email = payload['email'] as string | undefined;
  return upsertOauthUser('google', sub, email);
}

// Apple: valida JWT com JWKS público
const APPLE_ISS = 'https://appleid.apple.com';
async function getAppleJwks(){
  const res = await fetch('https://appleid.apple.com/auth/keys');
  if (!res.ok) throw new AppError('apple_jwks_unavailable', 503);
  return (await res.json()) as { keys: any[] };
}
export async function loginWithAppleIdToken(idToken: string){
  const { header } = jwt.decode(idToken, { complete: true }) as any;
  const jwks = await getAppleJwks();
  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new AppError('apple_key_not_found', 401);
  const pem = jwkToPem(jwk as any);
  const payload = jwt.verify(idToken, pem, { algorithms: ['RS256'], issuer: APPLE_ISS }) as any;
  const sub = payload['sub'] as string;
  const email = payload['email'] as string | undefined;
  return upsertOauthUser('apple', sub, email);
}

async function upsertOauthUser(provider: 'google'|'apple', subject: string, email?: string){
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let userId: string | null = null;
    if (email) {
      const { rows } = await client.query('SELECT id FROM users WHERE email=$1', [email]);
      if (rows[0]) userId = rows[0].id;
    }
    if (!userId) {
      const { rows } = await client.query('INSERT INTO users(email, name) VALUES ($1,$2) RETURNING id', [email ?? `${provider}_${subject}@placeholder.local`, null]);
      userId = rows[0].id;
    }
    await client.query(`INSERT INTO oauth_identities(user_id, provider, subject, email)
                        VALUES ($1,$2,$3,$4)
                        ON CONFLICT (provider, subject) DO UPDATE SET user_id=EXCLUDED.user_id, email=COALESCE(EXCLUDED.email, oauth_identities.email)`,
                        [userId, provider, subject, email ?? null]);
    await client.query('COMMIT');
    return { userId, token: generateToken(userId!) };
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
}
