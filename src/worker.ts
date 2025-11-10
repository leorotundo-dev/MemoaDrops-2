import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { scrapeQueue, vectorQueue } from './jobs/queues.js';
import { processLLMJob, llmQueue } from './jobs/llmQueue.js';
import { scrapeProcessor } from './jobs/scrapeJob.js';
import { vectorProcessor } from './jobs/vectorJob.js';

async function main() {
  console.log('🚀 Worker starting...');
  try {
    // Scraper worker
    new Worker(scrapeQueue.name, async (job: Job) => scrapeProcessor(job.data), { connection: scrapeQueue.opts.connection, concurrency: 1 });
    console.log('✅ Scraper worker attached');

    // Vector worker
    new Worker(vectorQueue.name, async (job: Job) => vectorProcessor(job.data), { connection: vectorQueue.opts.connection, concurrency: 3 });
    console.log('✅ Vector worker attached');

    // LLM worker
    new Worker(llmQueue.name, processLLMJob, { connection: llmQueue.opts.connection, concurrency: 5 });
    console.log('✅ LLM worker attached');

    console.log('🟢 Workers active and listening for jobs.');
  } catch (e) {
    console.error('❌ Worker init error:', e);
    process.exit(1);
  }
}

main();
