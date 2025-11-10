import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Função para criar conexão (evita repetição)
const createRedisConnection = () => new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Exigido pelo BullMQ
  connectTimeout: 10000,
  enableOfflineQueue: false,
});

// Conexões dedicadas para cada fila e eventos
export const scrapeQueue = new Queue('scrape', { connection: createRedisConnection() });
export const vectorQueue = new Queue('vector', { connection: createRedisConnection() });
export const scrapeEvents = new QueueEvents('scrape', { connection: createRedisConnection() });

// Exportar uma conexão para uso geral (ex: healthcheck)
export const redis = createRedisConnection();

// Logs de eventos para a conexão geral
redis.on('error', (err) => console.error('[Redis-General] Error:', err));
redis.on('ready', () => console.log('[Redis-General] Connection ready'));
