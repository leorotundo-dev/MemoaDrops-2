import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { createNotificationController, listMyNotificationsController } from '../controllers/notificationsController.js';

export async function notificationsRoutes(app: FastifyInstance) {
  app.post('/notifications', { preHandler: [authenticate] }, createNotificationController);
  app.get('/notifications', { preHandler: [authenticate] }, listMyNotificationsController);
}
