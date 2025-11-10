import { FastifyPluginAsync } from 'fastify';
import { createUserController, getUserController, getUserStatsController } from '../controllers/usersController.js';

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.post('/users', createUserController);
  app.get('/users/:id', getUserController);
  app.get('/users/:userId/stats', getUserStatsController);
};
