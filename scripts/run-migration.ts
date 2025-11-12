/**
 * Script para executar migração SQL
 * Executa o arquivo de migração 029_add_logo_data_to_bancas.sql
 */
import 'dotenv/config';
import { pool } from '../src/db/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Executando migração: 029_add_logo_data_to_bancas.sql\n');
    
    // Ler arquivo SQL
    const migrationPath = path.join(__dirname, '../src/db/migrations/029_add_logo_data_to_bancas.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    console.log('📄 SQL a ser executado:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60) + '\n');
    
    // Executar migração
    await pool.query(sql);
    
    console.log('✅ Migração executada com sucesso!\n');
    
    // Verificar se as colunas foram criadas
    const { rows } = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bancas' 
      AND column_name IN ('logo_data', 'logo_mime_type')
      ORDER BY column_name
    `);
    
    console.log('📊 Colunas criadas:');
    rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar migração
runMigration();
