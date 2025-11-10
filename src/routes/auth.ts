
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { registerController, loginController, meController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/auth/register', registerController);
  app.post('/auth/login',    loginController);
  app.get('/auth/me',        { preHandler: authenticate }, meController);
};
