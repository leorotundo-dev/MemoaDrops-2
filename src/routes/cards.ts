
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeDeck, authorizeCard } from '../middleware/authorize.js';
import {
  createCardController,
  getCardByIdController,
  getCardsByDeckController,
  deleteCardController,
  getCardsDueController,
} from '../controllers/cardsController.js';

export async function cardsRoutes(app: FastifyInstance) {
  // Criar card — apenas autenticação (rota de criação)
  app.post('/cards', { preHandler: [authenticate] }, createCardController);

  // Obter card por ID — autenticação + ownership de card
  app.get(
    '/cards/:id',
    { preHandler: [authenticate, authorizeCard] },
    getCardByIdController,
  );

  // Listar cards de um deck — autenticação + ownership de deck
  app.get(
    '/cards/deck/:deckId',
    { preHandler: [authenticate, authorizeDeck] },
    getCardsByDeckController,
  );

  // Deletar card — autenticação + ownership de card
  app.delete(
    '/cards/:id',
    { preHandler: [authenticate, authorizeCard] },
    deleteCardController,
  );

  // Cards vencidos por deck — autenticação + ownership de deck
  app.get(
    '/decks/:deckId/cards/due',
    { preHandler: [authenticate, authorizeDeck] },
    getCardsDueController,
  );
}
