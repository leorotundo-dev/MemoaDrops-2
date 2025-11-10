
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeDeck } from '../middleware/authorize.js';
import { AppError } from '../errors/AppError.js';
import {
  createDeckController,
  getDeckController,
  listDecksByUserController,
  deleteDeckController,
  deckSemanticSearchController,
} from '../controllers/decksController.js';
import { getCardsDueController } from '../controllers/cardsController.js';

export async function decksRoutes(app: FastifyInstance) {
  // Criar deck — apenas autenticação (rota de criação)
  app.post('/decks', { preHandler: [authenticate] }, createDeckController);

  // Obter deck por ID — autenticação + ownership de deck
  app.get(
    '/decks/:id',
    { preHandler: [authenticate, authorizeDeck] },
    getDeckController,
  );

  // Listar decks do usuário — autenticação + ownership (req.userId === params.userId)
  app.get(
    '/decks/user/:userId',
    {
      preHandler: [
        authenticate,
        async (req) => {
          const { userId } = req.params as any;
          if (req.userId !== userId) {
            throw new AppError('Acesso negado', 403);
          }
        },
      ],
    },
    listDecksByUserController,
  );

  // Deletar deck — autenticação + ownership de deck
  app.delete(
    '/decks/:id',
    { preHandler: [authenticate, authorizeDeck] },
    deleteDeckController,
  );

  // Buscar cards dentro do deck — autenticação + ownership de deck
  app.get(
    '/decks/:deckId/search',
    { preHandler: [authenticate, authorizeDeck] },
    deckSemanticSearchController,
  );

  // Cards vencidos por deck — autenticação + ownership de deck
  app.get(
    '/decks/:deckId/cards/due',
    { preHandler: [authenticate, authorizeDeck] },
    getCardsDueController,
  );
}
