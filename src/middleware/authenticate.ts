
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../errors/AppError.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  console.log('[AUTHENTICATE] Middleware executado para:', req.method, req.url);
  const auth = req.headers['authorization'];
  console.log('[AUTHENTICATE] Authorization header:', auth ? 'presente' : 'AUSENTE');
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new AppError('Token ausente', 401);
  }
  const token = auth.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload?.userId) {
    throw new AppError('Token inválido', 401);
  }
  req.userId = payload.userId;
}
