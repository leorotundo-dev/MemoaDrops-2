import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { addGenerateFlashcardsJob, llmQueue } from '../jobs/llmQueue.js';
import { generateFlashcards, improveFlashcard } from '../services/llm.js';

const GenerateFromUrlSchema = z.object({
  url: z.string().url(),
  deckId: z.string().uuid().optional(),
  subject: z.string().optional(),
  count: z.number().int().min(5).max(50).default(10)
});

export async function generateFlashcardsFromUrlController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = GenerateFromUrlSchema.parse(req.body);
  const job = await addGenerateFlashcardsJob({
    url: body.url,
    userId,
    deckId: body.deckId,
    options: { subject: body.subject, count: body.count }
  });
  return reply.code(202).send({ jobId: job.id, deckId: body.deckId, estimatedTime: 120 });
}

export async function generateFlashcardsFromTextController(req: FastifyRequest, reply: FastifyReply) {
  console.log('[LLM] Iniciando generateFlashcardsFromTextController');
  const schema = z.object({
    text: z.string().min(50),
    count: z.number().int().min(5).max(50).default(10),
    subject: z.string().optional(),
    deckId: z.string().uuid().optional()
  });
  const userId = (req as any).userId as string;
  console.log('[LLM] userId:', userId);
  
  const { text, count, subject, deckId } = schema.parse(req.body);
  console.log('[LLM] Dados parseados:', { textLength: text.length, count, subject, deckId });
  
  // Processar de forma assíncrona via fila (não bloquear API)
  console.log('[LLM] Adicionando job à fila...');
  const job = await addGenerateFlashcardsJob({
    text,
    userId,
    deckId,
    options: { subject, count }
  });
  console.log('[LLM] Job criado:', job.id);
  
  return reply.code(202).send({ jobId: job.id, deckId, estimatedTime: 60 });
}

export async function improveFlashcardController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    front: z.string().min(3),
    back: z.string().min(1)
  });
  const { front, back } = schema.parse(req.body);
  const improved = await improveFlashcard(front, back);
  return reply.send(improved);
}

export async function getGenerationStatusController(req: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({ jobId: z.string() });
  const { jobId } = schema.parse(req.params);
  const job = await llmQueue.getJob(jobId);
  if (!job) return reply.code(404).send({ error: 'job_not_found' });
  const state = await job.getState();
  const progress = job.progress || 0;
  const result = job.returnvalue;
  return reply.send({ status: state, progress, result });
}
