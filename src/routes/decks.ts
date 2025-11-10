import { FastifyPluginAsync } from 'fastify';
import { createDeckController, getDeckController, listDecksByUserController, deleteDeckController, deckSemanticSearchController } from '../controllers/decksController.js';

export const decksRoutes: FastifyPluginAsync = async (app) => {
  app.post('/decks', createDeckController);
  app.get('/decks/:id', getDeckController);
  app.get('/users/:userId/decks', listDecksByUserController);
  app.delete('/decks/:id', deleteDeckController);
  app.get('/decks/:deckId/search', deckSemanticSearchController);
};
