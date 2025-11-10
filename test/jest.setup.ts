import 'dotenv/config';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Import sem sufixo .js para evitar falhas de resolução no ESM do ts-jest
import { initTestDb } from './schema/init-db';

beforeAll(async () => {
  await initTestDb();
});
