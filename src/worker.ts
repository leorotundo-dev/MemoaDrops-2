import 'dotenv/config';
import { makeWorker } from './jobs/queues.js';

makeWorker();
console.log('[Worker] running…');
process.stdin.resume();
