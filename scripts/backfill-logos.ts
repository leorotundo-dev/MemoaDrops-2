/**
 * Script para atualizar logos de todas as bancas existentes
 * Busca e salva logos no banco de dados PostgreSQL
 */
import 'dotenv/config';
import { pool } from '../src/db/connection.js';
import { updateBancaLogo } from '../src/services/logo-fetcher.js';

async function backfillLogos() {
  try {
    console.log('🚀 Iniciando backfill de logos das bancas...\n');
    
    // Buscar todas as bancas ativas
    const { rows: bancas } = await pool.query(`
      SELECT id, name, display_name, website_url, logo_data
      FROM bancas 
      WHERE is_active = true
      ORDER BY name ASC
    `);
    
    console.log(`📊 Total de bancas encontradas: ${bancas.length}\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < bancas.length; i++) {
      const banca = bancas[i];
      const progress = `[${i + 1}/${bancas.length}]`;
      
      // Verificar se já tem logo
      if (banca.logo_data) {
        console.log(`${progress} ⏭️  ${banca.display_name || banca.name} - Logo já existe, pulando...`);
        skippedCount++;
        continue;
      }
      
      console.log(`${progress} 🔍 Processando: ${banca.display_name || banca.name}`);
      
      try {
        const success = await updateBancaLogo(banca.id);
        
        if (success) {
          console.log(`${progress} ✅ Logo atualizado com sucesso!\n`);
          successCount++;
        } else {
          console.log(`${progress} ❌ Falha ao atualizar logo\n`);
          errorCount++;
        }
        
        // Delay entre requisições para evitar rate limiting
        if (i < bancas.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`${progress} ❌ Erro ao processar ${banca.display_name || banca.name}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO BACKFILL');
    console.log('='.repeat(60));
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`⏭️  Pulados (já tinham logo): ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total processado: ${bancas.length}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('🎉 Backfill concluído!');
    
  } catch (error) {
    console.error('❌ Erro fatal no backfill:', error);
    process.exit(1);
  } finally {
    // Fechar conexão com o banco
    await pool.end();
  }
}

// Executar o backfill
backfillLogos();
