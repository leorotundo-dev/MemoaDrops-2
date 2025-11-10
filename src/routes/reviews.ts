
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeCard } from '../middleware/authorize.js';
import { reviewCardController } from '../controllers/reviewsController.js';

export async function reviewsRoutes(app: FastifyInstance) {
  // Review de card — autenticação + ownership de card
  app.post(
    '/cards/:cardId/review',
    { preHandler: [authenticate, authorizeCard] },
    reviewCardController,
  );
}
