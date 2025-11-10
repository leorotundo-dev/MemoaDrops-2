import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { scrapeProcessor } from './scrapeJob.js';
import { vectorProcessor } from './vectorJob.js';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const scrapeQueue = new Queue('scrape', { connection });
export const vectorQueue = new Queue('vector', { connection });
export const scrapeEvents = new QueueEvents('scrape', { connection });
export const vectorEvents = new QueueEvents('vector', { connection });

export function getQueueConnection() {
  return connection;
}

export function makeWorker() {
  // Scraper worker
  new Worker('scrape', async (job) => {
    return scrapeProcessor(job.data);
  }, { connection });

  // Vector worker
  new Worker('vector', async (job) => {
    return vectorProcessor(job.data);
  }, { connection });

  console.log('[Worker] Workers started (scrape, vector)');
}
