import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pool } from './connection.js';

async function main() {
  const migrationsDir = resolve(process.cwd(), 'src/db/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Executa em ordem alfabética (001, 002, etc)

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');
      console.log(`📄 Executing migration: ${file}`);
      await client.query(sql);
      console.log(`✅ Migration ${file} applied`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 All migrations applied successfully');
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
