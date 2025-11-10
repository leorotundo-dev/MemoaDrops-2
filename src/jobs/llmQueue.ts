import IORedis from 'ioredis';
import { Queue, Job, Worker } from 'bullmq';
import { pool } from '../db/connection.js';
import { processScrapedContent } from '../services/contentProcessor.js';
import { generateFlashcards } from '../services/llm.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

function newConn() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 15000 });
}

export const llmQueue = new Queue('llm-processing', {
  connection: newConn(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 500,
    removeOnFail: 200
  }
});

export async function addGenerateFlashcardsJob(data: {
  url?: string;
  text?: string;
  userId: string;
  deckId?: string;
  options?: { subject?: string; count?: number; };
}): Promise<Job> {
  const job = await llmQueue.add('generate', data, { priority: 5 });
  return job;
}

// Worker exemplo (caso o projeto já tenha um worker separado, manter apenas a assinatura)
export const llmWorker = new Worker('llm-processing', async (job: Job) => {
  const { url, text, userId, deckId, options } = job.data as any;

  let content = text as string | undefined;
  if (!content && url) {
    const processed = await processScrapedContent(url);
    content = processed.content;
  }
  if (!content) throw new Error('No content to process');

  const cards = await generateFlashcards(content!, { subject: options?.subject, count: options?.count || 10 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // criar deck se não existir
    let targetDeckId = deckId;
    if (!targetDeckId) {
      const r = await client.query('INSERT INTO decks(user_id, title) VALUES ($1,$2) RETURNING id', [userId, options?.subject || 'Deck gerado']);
      targetDeckId = r.rows[0].id;
    }
    for (const c of cards) {
      await client.query('INSERT INTO cards(deck_id, front, back) VALUES ($1,$2,$3)', [targetDeckId, c.front, c.back]);
    }
    await client.query('COMMIT');
    return;
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
}, { connection: newConn(), concurrency: 2 });
