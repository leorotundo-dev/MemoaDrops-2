
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import {
  startSessionController,
  finishSessionController,
} from '../controllers/studySessionsController.js';

export async function studySessionsRoutes(app: FastifyInstance) {
  // Criar sessão de estudo — apenas autenticação (por enquanto)
  app.post(
    '/study-sessions',
    { preHandler: [authenticate] },
    startSessionController,
  );

  // Completar sessão de estudo — apenas autenticação (por enquanto)
  app.patch(
    '/study-sessions/:id/complete',
    { preHandler: [authenticate] },
    finishSessionController,
  );
}
