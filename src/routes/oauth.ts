import type { FastifyInstance } from 'fastify';
import { oauthGoogleController, oauthAppleController } from '../controllers/oauthController.js';

export async function oauthRoutes(app: FastifyInstance){
  app.post('/auth/oauth/google', oauthGoogleController);
  app.post('/auth/oauth/apple', oauthAppleController);
}
