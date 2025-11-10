import { FastifyPluginAsync } from 'fastify';
import { startSessionController, finishSessionController } from '../controllers/studySessionsController.js';

export const studySessionsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/study-sessions', startSessionController);
  app.post('/study-sessions/:id/finish', finishSessionController);
};
