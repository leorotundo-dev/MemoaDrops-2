import { FastifyPluginAsync } from 'fastify';
import { createUserController, getUserController } from '../controllers/usersController.js';

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.post('/users', createUserController);
  app.get('/users/:id', getUserController);
};
