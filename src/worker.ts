import 'dotenv/config';
import { createWorkers } from './jobs/queues.js';

async function main() {
  console.log('🚀 Worker starting...');
  try {
    await createWorkers();
    console.log('🟢 Workers active and listening for jobs.');
  } catch (e) {
    console.error('❌ Worker init error:', e);
    process.exit(1);
  }
}

main();
