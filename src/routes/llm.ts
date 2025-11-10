import { FastifyInstance } from 'fastify';
import { generateFlashcardsFromTextController } from '../controllers/llmController.js';
import { authenticate } from '../middleware/authenticate.js';

export async function llmRoutes(app: FastifyInstance) {
  app.post('/llm/generate/text', { preHandler: [authenticate] }, generateFlashcardsFromTextController);
}
