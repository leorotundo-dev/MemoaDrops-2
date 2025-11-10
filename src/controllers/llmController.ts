import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { addGenerateFlashcardsJob } from '../jobs/llmQueue.js';
import { AppError } from '../errors/AppError.js';

const GenerateFromTextSchema = z.object({
  text: z.string().min(50),
  count: z.number().int().min(5).max(50).default(10),
  subject: z.string().optional(),
  deckId: z.string().uuid().optional()
});

export async function generateFlashcardsFromTextController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req as any).userId as string;
    const { text, count, subject, deckId } = GenerateFromTextSchema.parse(req.body);

    const job = await addGenerateFlashcardsJob({
      text,
      userId,
      deckId,
      options: { subject, count }
    });

    return reply.code(202).send({ jobId: job.id, deckId, estimatedTime: 120 });
  } catch (err: any) {
    if (err.message === 'Timeout ao adicionar job') {
      return reply.code(504).send({ error: 'Gateway Timeout: O serviço de fila demorou para responder.' });
    }
    const status = err instanceof AppError ? err.status : 500;
    return reply.code(status).send({ error: err.message || 'Erro ao criar job de geração' });
  }
}

const GenerateFromUrlSchema = z.object({
  url: z.string().url(),
  count: z.number().int().min(5).max(50).default(10),
  subject: z.string().optional(),
  deckId: z.string().uuid().optional()
});

export async function generateFlashcardsFromUrlController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req as any).userId as string;
    const { url, count, subject, deckId } = GenerateFromUrlSchema.parse(req.body);

    const job = await addGenerateFlashcardsJob({
      url,
      userId,
      deckId,
      options: { subject, count }
    });

    return reply.code(202).send({ jobId: job.id, deckId, estimatedTime: 120 });
  } catch (err: any) {
    if (err.message === 'Timeout ao adicionar job') {
      return reply.code(504).send({ error: 'Gateway Timeout: O serviço de fila demorou para responder.' });
    }
    const status = err instanceof AppError ? err.status : 500;
    return reply.code(status).send({ error: err.message || 'Erro ao criar job de geração' });
  }
}

const ImproveCardSchema = z.object({
  feedback: z.string().optional(),
  targetLanguage: z.string().optional(),
  makeSimpler: z.boolean().optional(),
  addExamples: z.boolean().optional()
});

export async function improveCardController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { cardId } = req.params as { cardId: string };
    const userId = (req as any).userId as string;
    const improvements = ImproveCardSchema.parse(req.body);

    // TODO: Implement card improvement logic with LLM
    // For now, return a placeholder response
    return reply.code(501).send({ 
      error: 'Not Implemented',
      message: 'Card improvement feature is under development'
    });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 500;
    return reply.code(status).send({ error: err.message || 'Erro ao melhorar card' });
  }
}

export async function getJobStatusController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobId } = req.params as { jobId: string };
    
    // Import queue dynamically to avoid circular dependencies
    const { llmQueue } = await import('../jobs/llmQueue.js');
    const job = await llmQueue.getJob(jobId);

    if (!job) {
      return reply.code(404).send({ error: 'Job não encontrado' });
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return reply.code(200).send({
      id: job.id,
      state,
      progress,
      returnValue,
      failedReason
    });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 500;
    return reply.code(status).send({ error: err.message || 'Erro ao consultar job' });
  }
}
