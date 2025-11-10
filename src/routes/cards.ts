import { FastifyPluginAsync } from 'fastify';
import { createCardController, getCardController, listCardsByDeckController, deleteCardController } from '../controllers/cardsController.js';

export const cardsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/cards', createCardController);
  app.get('/cards/:id', getCardController);
  app.get('/decks/:deckId/cards', listCardsByDeckController);
  app.delete('/cards/:id', deleteCardController);
};
