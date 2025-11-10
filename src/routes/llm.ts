import { FastifyInstance } from 'fastify';
import { 
  generateFlashcardsFromTextController,
  generateFlashcardsFromUrlController,
  improveCardController,
  getJobStatusController
} from '../controllers/llmController.js';
import { authenticate } from '../middleware/authenticate.js';

export async function llmRoutes(app: FastifyInstance) {
  app.post('/llm/generate/text', { preHandler: [authenticate] }, generateFlashcardsFromTextController);
  app.post('/llm/generate/url', { preHandler: [authenticate] }, generateFlashcardsFromUrlController);
  app.post('/llm/improve/:cardId', { preHandler: [authenticate] }, improveCardController);
  app.get('/llm/jobs/:jobId', { preHandler: [authenticate] }, getJobStatusController);
}
