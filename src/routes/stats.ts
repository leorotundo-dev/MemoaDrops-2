import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeDeck } from '../middleware/authorize.js';
import { deckStatsController, heatmapController } from '../controllers/statsController.js';

export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats/decks/:deckId', { preHandler: [authenticate, authorizeDeck] }, deckStatsController);
  app.get('/stats/heatmap/:userId', { preHandler: [authenticate] }, heatmapController);
}
