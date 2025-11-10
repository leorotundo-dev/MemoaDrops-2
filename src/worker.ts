import 'dotenv/config';
import { createWorkers } from './jobs/queues.js';
import { createCardEmbeddingWorkers } from './queues/embeddingQueue.js';

async function main() {
  console.log('🚀 Worker starting...');
  try {
    // Legacy workers (scraping)
    await createWorkers();
    
    // New workers (card embeddings)
    createCardEmbeddingWorkers();
    
    console.log('🟢 Workers active and listening for jobs.');
  } catch (e) {
    console.error('❌ Worker init error:', e);
    process.exit(1);
  }
}

main();
