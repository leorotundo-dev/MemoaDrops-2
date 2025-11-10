import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { pool } from '../db/connection.js';
import { embedText } from '../services/embeddingsService.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const cardEmbeddingQueue = new Queue('card-embedding', { connection });

const opts: JobsOptions = {
  attempts: 5,
  removeOnComplete: true,
  backoff: { type: 'exponential', delay: 1000 }
};

export async function addCardEmbeddingJob(cardId: string) {
  return cardEmbeddingQueue.add('embed:card', { cardId }, opts);
}

export function createCardEmbeddingWorkers() {
  const qe = new QueueEvents('card-embedding', { connection });
  qe.on('failed', ({ jobId, failedReason }) => console.error('[card-embedding failed]', jobId, failedReason));

  new Worker('card-embedding', async (job) => {
    const { cardId } = job.data as { cardId: string };
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT id, front, back FROM cards WHERE id=$1', [cardId]);
      const row = rows?.[0];
      if (!row) return { ok:false, reason:'card_not_found' };
      const embedding = await embedText(`${row.front}
${row.back}`);
      await client.query('UPDATE cards SET embedding=$1 WHERE id=$2', [embedding, row.id]);
      return { ok:true, dims: embedding.length };
    } finally {
      client.release();
    }
  }, { connection, concurrency: 4 });

  console.log('[Worker] Card Embedding worker up');
}
