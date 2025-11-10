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
    const status = err instanceof AppError ? err.statusCode : 500;
    return reply.code(status).send({ error: err.message || 'Erro ao criar job de geração' });
  }
}
