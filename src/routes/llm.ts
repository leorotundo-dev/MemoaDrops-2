import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import multipart from '@fastify/multipart';
import {
  improveCardController,
  generateFlashcardsFromFileController,
  generateFlashcardsFromImageController
} from '../controllers/llmController.js';

export async function llmRoutes(app: FastifyInstance){
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

  app.post('/llm/improve/:cardId', { preHandler: [authenticate] }, improveCardController);
  app.post('/llm/generate/file', { preHandler: [authenticate] }, generateFlashcardsFromFileController);
  app.post('/llm/generate/image', { preHandler: [authenticate] }, generateFlashcardsFromImageController);
}
