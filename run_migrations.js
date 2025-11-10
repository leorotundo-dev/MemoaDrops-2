const { Client } = require('pg');
const fs = require('fs');

(async () => {
  const client = new Client();
  await client.connect();
  
  const sql = fs.readFileSync('/home/ubuntu/MemoaDrops-2/src/db/migrations/001_initial_schema.sql', 'utf-8');
  
  await client.query(sql);
  await client.end();
  
  console.log('✅ Migrations executed successfully!');
})().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
