import 'dotenv/config';
import { Worker } from 'bullmq';
import { createWorkers, redis } from './jobs/queues.js';
import { createCardEmbeddingWorkers } from './queues/embeddingQueue.js';
import { processLLMJob, llmQueue } from './jobs/llmQueue.js';

async function main() {
  console.log('🚀 Worker starting...');
  try {
    // Legacy workers (scraping)
    await createWorkers();
    
    // New workers (card embeddings)
    createCardEmbeddingWorkers();
    
    // LLM workers (flashcard generation)
    new Worker(llmQueue.name, processLLMJob, { connection: redis, concurrency: 5 });
    console.log('✅ LLM worker attached (5 concurrent jobs)');
    
    console.log('🟢 Workers active and listening for jobs.');
  } catch (e) {
    console.error('❌ Worker init error:', e);
    process.exit(1);
  }
}

main();
