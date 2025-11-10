import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { updateProfileController, updatePrefsController, exportMyDataController, deleteMyAccountController } from '../controllers/profileController.js';

export async function profileRoutes(app: FastifyInstance) {
  app.patch('/me', { preHandler: [authenticate] }, updateProfileController);
  app.patch('/me/prefs', { preHandler: [authenticate] }, updatePrefsController);
  app.get('/me/export', { preHandler: [authenticate] }, exportMyDataController);
  app.delete('/me', { preHandler: [authenticate] }, deleteMyAccountController);
}
