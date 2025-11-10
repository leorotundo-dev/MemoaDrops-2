import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import {
  getMyNotificationPrefsController,
  updateMyNotificationPrefsController
} from '../controllers/notificationPrefsController.js';

export async function notificationPrefsRoutes(app: FastifyInstance){
  // Lê preferências do usuário logado
  app.get('/me/notifications', { preHandler: [authenticate] }, getMyNotificationPrefsController);
  // Atualiza preferências do usuário logado
  app.patch('/me/notifications', { preHandler: [authenticate] }, updateMyNotificationPrefsController);
}
