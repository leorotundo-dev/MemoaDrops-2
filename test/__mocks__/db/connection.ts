import { newDb } from 'pg-mem';

// Single in-memory database instance for the whole test run
const db = newDb({ autoCreateForeignKeyIndices: true });

// Register gen_random_uuid function for pg-mem
db.public.registerFunction({
  name: 'gen_random_uuid',
  implementation: () => {
    return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  },
} as any);

// Register now() function for pg-mem
db.public.registerFunction({
  name: 'now',
  implementation: () => new Date(),
} as any);

// Expose a function for schema initialization
export async function initSchema(sql: string): Promise<void> {
  db.public.none(sql);
}

const pgAdapter = db.adapters.createPg();
export const pool = new pgAdapter.Pool();

export default { pool };
