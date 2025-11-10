import { addGenerateFlashcardsJob } from '../jobs/llmQueue.js';

export async function generateFlashcardsFromUrl(
  url: string,
  userId: string,
  options?: { deckId?: string; subject?: string; count?: number; }
): Promise<{ jobId: string; deckId: string; estimatedTime: number; }> {
  const job = await addGenerateFlashcardsJob({
    url,
    userId,
    deckId: options?.deckId,
    options: { subject: options?.subject, count: options?.count }
  });
  return { jobId: String(job.id), deckId: options?.deckId || '', estimatedTime: 120 };
}
