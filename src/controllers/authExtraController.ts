import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createRefreshToken, rotateRefreshToken, createVerifyEmailCode, verifyEmailCode, createPasswordResetCode, consumePasswordResetCode } from '../services/authExtraService.js';
import { hashPassword } from '../utils/password.js';
import { pool } from '../db/connection.js';

export async function refreshTokenController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ refreshToken: z.string() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const rotated = await rotateRefreshToken(body.data.refreshToken);
  if (!rotated) return reply.code(401).send({ error: 'invalid_refresh_token' });
  return rotated;
}

export async function requestEmailVerificationController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const code = await createVerifyEmailCode(userId);
  // Aqui enviaríamos email/SMS — por enquanto retorna o código para desenvolvimento
  return { code };
}

export async function verifyEmailController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = z.object({ code: z.string() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const ok = await verifyEmailCode(userId, body.data.code);
  return ok ? { ok: true } : reply.code(400).send({ error: 'invalid_code' });
}

export async function requestPasswordResetController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [body.data.email]);
  if (!rows[0]) return { ok: true }; // não revela existência
  const code = await createPasswordResetCode(rows[0].id);
  return { ok: true, code }; // em prod, enviar por email
}

export async function resetPasswordController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ email: z.string().email(), code: z.string(), newPassword: z.string().min(8) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [body.data.email]);
  if (!rows[0]) return reply.code(400).send({ error: 'invalid_email' });
  const ok = await consumePasswordResetCode(rows[0].id, body.data.code);
  if (!ok) return reply.code(400).send({ error: 'invalid_code' });
  const hash = await hashPassword(body.data.newPassword);
  await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, rows[0].id]);
  return { ok: true };
}

export async function logoutController(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ refreshToken: z.string() }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: body.error.issues });
  await pool.query('UPDATE refresh_tokens SET revoked_at=now() WHERE token=$1', [body.data.refreshToken]);
  return { ok: true };
}
