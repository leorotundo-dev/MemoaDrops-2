import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { pullDueNotifications, markDelivered } from '../services/notificationsService.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
function newConn() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 15000 });
}

export const notificationsQueue = new Queue('notifications', {
  connection: newConn(),
  defaultJobOptions: { removeOnComplete: 500, removeOnFail: 100 }
});

export async function enqueueNotificationsSweep() {
  await notificationsQueue.add('sweep', {}, { repeat: { every: 15 * 60 * 1000 } }); // a cada 15 min
}

// Worker simples: pega notificações vencidas e "envia"
export const notificationsWorker = new Worker('notifications', async (job) => {
  const due = await pullDueNotifications(200);
  for (const n of due) {
    // Aqui você integraria push provider (FCM/APNs). Por enquanto, log.
    console.log('[notify]', n.user_id, n.type, n.schedule_at);
    await markDelivered(n.id);
  }
}, { connection: newConn(), concurrency: 1 });
