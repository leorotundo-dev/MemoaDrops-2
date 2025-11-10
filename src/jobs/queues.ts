import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { scrapeProcessor } from './scrapeJob.js';
import { vectorProcessor } from './vectorJob.js';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,  // Exigido pelo BullMQ
  connectTimeout: 10000,
  enableReadyCheck: true,
  retryStrategy(times) {
    // Limitar tentativas de reconexão
    if (times > 10) {
      console.error('[Redis] Máximo de tentativas de reconexão atingido');
      return null; // Para de tentar
    }
    return Math.min(times * 100, 3000); // Backoff exponencial até 3s
  }
});
export const redis = connection;

export const scrapeQueue = new Queue('scrape', { connection });
export const vectorQueue = new Queue('vector', { connection });
export const scrapeEvents = new QueueEvents('scrape', { connection });
export const vectorEvents = new QueueEvents('vector', { connection });

const defaultJobOpts: JobsOptions = {
  attempts: 5,
  removeOnComplete: true,
  backoff: { type: 'exponential', delay: 2000 }
};

export function createWorkers() {
  new Worker('scrape', async (job) => {
    try {
      return await scrapeProcessor(job.data);
    } catch (e:any) {
      job.log(`scrape error: ${e?.message}`);
      throw e;
    }
  }, { connection, concurrency: 2 });

  new Worker('vector', async (job) => {
    try {
      return await vectorProcessor(job.data);
    } catch (e:any) {
      job.log(`vector error: ${e?.message}`);
      throw e;
    }
  }, { connection, concurrency: 4 });

  scrapeEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[scrape failed]', jobId, failedReason);
  });
  vectorEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[vector failed]', jobId, failedReason);
  });

  console.log('[Worker] Workers up and ready to process jobs');
}

export function addScrape(douUrl: string) {
  return scrapeQueue.add('scrape:contest', { douUrl }, defaultJobOpts);
}

export function addVector(conteudoId: number) {
  return vectorQueue.add('vector:conteudo', { conteudoId }, defaultJobOpts);
}
