import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { totpSetupController, totpEnableController, totpLoginController } from '../controllers/totpController.js';

export async function totpRoutes(app: FastifyInstance){
  app.post('/auth/2fa/setup', { preHandler: [authenticate] }, totpSetupController);
  app.post('/auth/2fa/enable', { preHandler: [authenticate] }, totpEnableController);
  app.post('/auth/2fa/login', { preHandler: [authenticate] }, totpLoginController);
}
