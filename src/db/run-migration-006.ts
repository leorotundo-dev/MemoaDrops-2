import { pool } from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('[Migration 006] Iniciando correção da tabela materias...');
    
    const migrationPath = path.join(__dirname, 'migrations', '006_fix_materias_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('[Migration 006] ✅ Tabela materias corrigida com sucesso!');
    
  } catch (error: any) {
    console.error('[Migration 006] ❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log('[Migration 006] Concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Migration 006] Falhou:', error);
    process.exit(1);
  });
