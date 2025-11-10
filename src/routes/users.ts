
import type { FastifyInstance } from 'fastify';
import {
  createUserController,
  getUserByIdController,
  getUserStatsController,
} from '../controllers/usersController.js';

export async function usersRoutes(app: FastifyInstance) {
  app.post('/users', createUserController);
  app.get('/users/:id', getUserByIdController);
  app.get('/users/:userId/stats', getUserStatsController);
}
