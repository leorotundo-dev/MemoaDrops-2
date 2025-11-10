import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { searchCardsController } from '../controllers/statsController.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search/cards', { preHandler: [authenticate] }, searchCardsController);
}
