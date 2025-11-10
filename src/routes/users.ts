
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import {
  createUserController,
  getUserByIdController,
  getUserStatsController,
} from '../controllers/usersController.js';

export async function usersRoutes(app: FastifyInstance) {
  // Criar usuário — requer autenticação (rota de criação)
  app.post('/users', { preHandler: authenticate }, createUserController);

  // Obter usuário por ID — autenticação + ownership (req.userId === params.id)
  app.get(
    '/users/:id',
    {
      preHandler: [
        authenticate,
        async (req) => {
          const { id } = req.params as any;
          if (req.userId !== id) {
            throw new AppError('Acesso negado', 403);
          }
        },
      ],
    },
    getUserByIdController,
  );

  // Estatísticas do usuário — autenticação + ownership (req.userId === params.userId)
  app.get(
    '/users/:userId/stats',
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
    getUserStatsController,
  );
}
