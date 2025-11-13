import { pool } from './connection.js';

async function runMigration() {
  try {
    console.log('[Migration] Alterando tipo da coluna salario para text...');
    
    await pool.query('ALTER TABLE concursos ALTER COLUMN salario TYPE text;');
    
    console.log('[Migration] Migração concluída com sucesso!');
    process.exit(0);
  } catch (error: any) {
    if (error.message.includes('cannot be cast automatically')) {
      console.log('[Migration] Coluna já é do tipo text ou precisa de conversão manual');
      process.exit(0);
    }
    console.error('[Migration] Erro na migração:', error.message);
    process.exit(1);
  }
}

runMigration();
