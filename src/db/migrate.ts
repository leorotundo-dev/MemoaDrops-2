import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from './connection.js';

async function main() {
  const file = resolve(process.cwd(), 'src/db/migrations/001_initial_schema.sql');
  const sql = readFileSync(file, 'utf-8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration applied');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
