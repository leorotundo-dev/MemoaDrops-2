import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import { updateBancaLogo } from '../services/logo-fetcher.js';

export async function backfillLogosRoutes(app: FastifyInstance) {
  app.post('/admin/backfill-logos', async (req, reply) => {
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
      
      const results = {
        total: bancas.length,
        success: 0,
        skipped: 0,
        errors: 0,
        details: [] as any[]
      };
      
      for (let i = 0; i < bancas.length; i++) {
        const banca = bancas[i];
        const progress = `[${i + 1}/${bancas.length}]`;
        
        // Verificar se já tem logo
        if (banca.logo_data) {
          console.log(`${progress} ⏭️  ${banca.display_name || banca.name} - Logo já existe, pulando...`);
          results.skipped++;
          results.details.push({
            banca: banca.display_name || banca.name,
            status: 'skipped',
            reason: 'Logo já existe'
          });
          continue;
        }
        
        console.log(`${progress} 🔍 Processando: ${banca.display_name || banca.name}`);
        
        try {
          const success = await updateBancaLogo(banca.id);
          
          if (success) {
            console.log(`${progress} ✅ Logo atualizado com sucesso!\n`);
            results.success++;
            results.details.push({
              banca: banca.display_name || banca.name,
              status: 'success'
            });
          } else {
            console.log(`${progress} ❌ Falha ao atualizar logo\n`);
            results.errors++;
            results.details.push({
              banca: banca.display_name || banca.name,
              status: 'error',
              reason: 'Falha ao buscar ou salvar logo'
            });
          }
          
          // Delay entre requisições para evitar rate limiting
          if (i < bancas.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error: any) {
          console.error(`${progress} ❌ Erro ao processar ${banca.display_name || banca.name}:`, error);
          results.errors++;
          results.details.push({
            banca: banca.display_name || banca.name,
            status: 'error',
            reason: error.message || 'Erro desconhecido'
          });
        }
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 RESUMO DO BACKFILL');
      console.log('='.repeat(60));
      console.log(`✅ Sucesso: ${results.success}`);
      console.log(`⏭️  Pulados (já tinham logo): ${results.skipped}`);
      console.log(`❌ Erros: ${results.errors}`);
      console.log(`📊 Total processado: ${results.total}`);
      console.log('='.repeat(60) + '\n');
      
      return {
        success: true,
        message: 'Backfill concluído!',
        results
      };
      
    } catch (error: any) {
      console.error('❌ Erro fatal no backfill:', error);
      return reply.status(500).send({
        success: false,
        error: error?.message || String(error),
        details: error?.stack || 'No stack trace available'
      });
    }
  });
}
