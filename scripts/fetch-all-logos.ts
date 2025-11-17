// @ts-nocheck
/**
 * Script para buscar e salvar logos de todas as bancas
 */
import { pool } from '../src/db/connection.js';

async function fetchAllLogos() {
  try {
    console.log('🔍 Buscando todas as bancas...');
    
    // Buscar todas as bancas
    const result = await pool.query(`
      SELECT id, name, short_name, display_name, website_url
      FROM bancas
      WHERE is_active = true
      ORDER BY name
    `);
    
    const bancas = result.rows;
    console.log(`📊 Encontradas ${bancas.length} bancas ativas\n`);
    
    for (const banca of bancas) {
      console.log(`\n🏢 Processando: ${banca.display_name || banca.name} (ID: ${banca.id})`);
      
      try {
        // Importar função de atualização
        const { updateBancaLogo } = await import('../src/services/logo-fetcher.js');
        
        // Tentar atualizar o logo
        const success = await updateBancaLogo(banca.id);
        
        if (success) {
          console.log(`   ✅ Logo salvo com sucesso!`);
        } else {
          console.log(`   ⚠️  Não foi possível encontrar/salvar logo`);
        }
        
        // Pequeno delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Erro ao processar banca:`, error.message);
      }
    }
    
    console.log('\n\n✅ Processamento concluído!');
    console.log('📊 Verificando logos salvos...\n');
    
    // Verificar quantos logos foram salvos
    const logosResult = await pool.query(`
      SELECT COUNT(*) as total FROM banca_logos
    `);
    
    console.log(`💾 Total de logos salvos: ${logosResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await pool.end();
  }
}

// Executar
fetchAllLogos();
