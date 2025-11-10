import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

(async () => {
  const client = new Client();
  await client.connect();
  
  const sql = fs.readFileSync('./src/db/migrations/001_initial_schema.sql', 'utf-8');
  
  await client.query(sql);
  await client.end();
  
  console.log('✅ Migrations executed successfully!');
})().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
