
import type { FastifyInstance } from 'fastify';
import {
  createCardController,
  getCardByIdController,
  getCardsByDeckController,
  deleteCardController,
  getCardsDueController,
} from '../controllers/cardsController.js';

export async function cardsRoutes(app: FastifyInstance) {
  app.post('/cards', createCardController);
  app.get('/cards/:id', getCardByIdController);
  app.get('/decks/:deckId/cards', getCardsByDeckController);
  app.get('/decks/:deckId/cards/due', getCardsDueController);
  app.delete('/cards/:id', deleteCardController);
}
