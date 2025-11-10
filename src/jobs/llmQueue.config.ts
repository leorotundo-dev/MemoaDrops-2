import IORedis from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
function newConn(){ return new IORedis(REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 15000 }); }

export const llmDLQ = new Queue('llm-dlq', { connection: newConn() });
export const llmQueue = new Queue('llm-processing', {
  connection: newConn(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 200
  }
});
export const llmEvents = new QueueEvents('llm-processing', { connection: newConn() });

export async function enqueueLLM(data: any, priority=5){
  return llmQueue.add('generate', data, { priority });
}
