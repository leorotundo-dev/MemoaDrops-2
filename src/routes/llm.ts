import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import {
  generateFlashcardsFromUrlController,
  generateFlashcardsFromTextController,
  improveFlashcardController,
  getGenerationStatusController
} from '../controllers/llmController.js';

// simple per-user rate limit (10 req/min)
const WINDOW_MS = 60_000;
const LIMIT = 10;
const userCalls = new Map<string, number[]>();
function rateLimitPreHandler(userId: string) {
  const now = Date.now();
  const arr = (userCalls.get(userId) || []).filter(ts => now - ts < WINDOW_MS);
  if (arr.length >= LIMIT) throw new Error('rate_limited');
  arr.push(now);
  userCalls.set(userId, arr);
}

export const llmRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/llm/generate/url', { preHandler: [authenticate, (req)=>rateLimitPreHandler((req as any).userId)] }, generateFlashcardsFromUrlController);
  app.post('/llm/generate/text', { preHandler: [authenticate, (req)=>rateLimitPreHandler((req as any).userId)] }, generateFlashcardsFromTextController);
  app.post('/llm/improve/:cardId?', { preHandler: [authenticate, (req)=>rateLimitPreHandler((req as any).userId)] }, improveFlashcardController);
  app.get('/llm/jobs/:jobId', { preHandler: [authenticate, (req)=>rateLimitPreHandler((req as any).userId)] }, getGenerationStatusController);
};
