import 'dotenv/config';
import IORedis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { scrapeQueue, vectorQueue } from './jobs/queues.js';
import { llmQueue, llmWorker } from './jobs/llmQueue.js';
import { notificationsQueue, enqueueNotificationsSweep } from './jobs/notificationsQueue.js';
import { pullDueNotifications, markDelivered } from './services/notificationsService.js';
import { scrapeProcessor } from './jobs/scrapeJob.js';
import { vectorProcessor } from './jobs/vectorJob.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Helper function to create dedicated Redis connections for Workers
function createWorkerConnection() {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 10) {
        console.error('❌ Redis connection failed after 10 retries');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    }
  });
}

async function main() {
  console.log('🚀 Worker starting...');
  try {
    // Scraper worker - dedicated connection
    const scrapeWorkerConn = createWorkerConnection();
    new Worker(scrapeQueue.name, async (job: Job) => scrapeProcessor(job.data), { 
      connection: scrapeWorkerConn, 
      concurrency: 1 
    });
    console.log('✅ Scraper worker attached');

    // Vector worker - dedicated connection
    const vectorWorkerConn = createWorkerConnection();
    new Worker(vectorQueue.name, async (job: Job) => vectorProcessor(job.data), { 
      connection: vectorWorkerConn, 
      concurrency: 3 
    });
    console.log('✅ Vector worker attached');

    // LLM worker - já criado em llmQueue.ts (llmWorker)
    console.log('✅ LLM worker attached');

    // Notifications worker - dedicated connection
    const notificationsWorkerConn = createWorkerConnection();
    new Worker(notificationsQueue.name, async (job: Job) => {
      const due = await pullDueNotifications(200);
      for (const n of due) {
        // Aqui você integraria push provider (FCM/APNs). Por enquanto, log.
        console.log('[notify]', n.user_id, n.type, n.schedule_at);
        await markDelivered(n.id);
      }
    }, { connection: notificationsWorkerConn, concurrency: 1 });
    console.log('✅ Notifications worker attached');

    // Enqueue recurring sweep job
    await enqueueNotificationsSweep();
    console.log('✅ Notifications sweep scheduled (every 15 min)');

    console.log('🟢 Workers active and listening for jobs.');
  } catch (e) {
    console.error('❌ Worker init error:', e);
    process.exit(1);
  }
}

main();
