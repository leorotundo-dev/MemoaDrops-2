import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeCard, authorizeDeck } from '../middleware/authorize.js';
import {
  createCardController,
  getCardByIdController,
  getCardsByDeckController,
  getCardsDueController,
  updateCardController,
  deleteCardController
} from '../controllers/cardsController.js';

export async function cardsRoutes(app: FastifyInstance) {
  app.post('/cards', { preHandler: [authenticate] }, createCardController);
  app.get('/cards/:id', { preHandler: [authenticate, authorizeCard] }, getCardByIdController);
  app.get('/decks/:deckId/cards', { preHandler: [authenticate, authorizeDeck] }, getCardsByDeckController);
  app.get('/decks/:deckId/cards/due', { preHandler: [authenticate, authorizeDeck] }, getCardsDueController);
  app.patch('/cards/:id', { preHandler: [authenticate, authorizeCard] }, updateCardController);
  app.delete('/cards/:id', { preHandler: [authenticate, authorizeCard] }, deleteCardController);
}
