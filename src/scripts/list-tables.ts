import 'dotenv/config';
import { pool } from '../db/connection.js';

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Listando tabelas do banco de dados...\n');
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log(`\nTotal: ${result.rows.length} tabelas`);
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
