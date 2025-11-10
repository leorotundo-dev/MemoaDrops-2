import { FastifyPluginAsync } from 'fastify';
import { reviewCardController } from '../controllers/reviewsController.js';

export const reviewsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/cards/:id/review', reviewCardController);
};
