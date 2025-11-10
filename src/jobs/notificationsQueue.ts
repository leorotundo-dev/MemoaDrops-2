import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { pullDueNotifications, markDelivered } from '../services/notificationsService.js';
import { pool } from '../db/connection.js';
import { sendPushFCM } from '../services/pushService.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
function newConn() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 15000 });
}

export const notificationsQueue = new Queue('notifications', {
  connection: newConn(),
  defaultJobOptions: { removeOnComplete: 500, removeOnFail: 100, attempts: 5, backoff: { type: 'exponential', delay: 2000 } }
});

export async function enqueueNotificationsSweep() {
  await notificationsQueue.add('sweep', {}, { repeat: { every: 15 * 60 * 1000 } }); // a cada 15 min
}

// Worker: pega notificações vencidas e envia via FCM
export const notificationsWorker = new Worker('notifications', async (job) => {
  const due = await pullDueNotifications(200);
  for (const n of due) {
    const { rows: devs } = await pool.query('SELECT token FROM user_devices WHERE user_id=$1', [n.user_id]);
    for (const d of devs) {
      await sendPushFCM(d.token, { title: 'MemoDrops', body: `Você tem estudo pendente: ${n.type}`, data: { type: n.type } });
    }
    await markDelivered(n.id);
  }
}, { connection: newConn(), concurrency: 1 });
