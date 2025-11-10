import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { refreshTokenController, requestEmailVerificationController, verifyEmailController, requestPasswordResetController, resetPasswordController, logoutController } from '../controllers/authExtraController.js';

export async function authExtraRoutes(app: FastifyInstance) {
  app.post('/auth/refresh', refreshTokenController);
  app.post('/auth/logout', logoutController);
  app.post('/auth/verify/request', { preHandler: [authenticate] }, requestEmailVerificationController);
  app.post('/auth/verify/confirm', { preHandler: [authenticate] }, verifyEmailController);
  app.post('/auth/password/request', requestPasswordResetController);
  app.post('/auth/password/reset', resetPasswordController);
}
