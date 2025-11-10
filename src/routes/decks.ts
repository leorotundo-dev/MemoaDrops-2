import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeDeck } from '../middleware/authorize.js';
import {
  createDeckController,
  getDeckByIdController,
  getDecksByUserController,
  deleteDeckController,
  updateDeckController,
  listPublicDecksController,
  cloneDeckController
} from '../controllers/decksController.js';

export async function decksRoutes(app: FastifyInstance) {
  app.post('/decks', { preHandler: [authenticate] }, createDeckController);
  app.get('/decks/:id', { preHandler: [authenticate, authorizeDeck] }, getDeckByIdController);

  // listar decks do próprio usuário (ownership inline)
  app.get('/decks/user/:userId', { preHandler: [authenticate] }, getDecksByUserController);

  app.patch('/decks/:id', { preHandler: [authenticate, authorizeDeck] }, updateDeckController);
  app.delete('/decks/:id', { preHandler: [authenticate, authorizeDeck] }, deleteDeckController);

  // públicos e clonagem (apenas autenticado)
  app.get('/decks/public', { preHandler: [authenticate] }, listPublicDecksController);
  app.post('/decks/:id/clone', { preHandler: [authenticate] }, cloneDeckController);
}
