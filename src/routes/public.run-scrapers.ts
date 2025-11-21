import { pool } from '../db/connection.js';
import { extractAllEditalUrls } from '../services/edital-url-extractor.js';

/**
 * ROTA PÚBLICA TEMPORÁRIA - REMOVER APÓS USO
 * Esta rota permite verificar status dos concursos sem autenticação
 * APENAS PARA TESTE - NÃO USAR EM PRODUÇÃO
 */
export default async function publicRunScrapersRoutes(fastify, options) {
  
  /**
   * Rota para verificar status dos concursos
   */
  fastify.get('/public/check-status', async (req, reply) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(edital_url) as com_url,
          COUNT(*) - COUNT(edital_url) as sem_url
        FROM concursos
      `);
      
      return reply.send({
        success: true,
        statistics: {
          total_concursos: parseInt(result.rows[0].total),
          com_edital_url: parseInt(result.rows[0].com_url),
          sem_edital_url: parseInt(result.rows[0].sem_url)
        }
      });
    } catch (error) {
      console.error('[Public Check Status] ❌ Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  /**
   * Rota para executar scrapers (TEMPORÁRIA)
   */
  fastify.post('/public/run-scrapers', async (req, reply) => {
    try {
      // Buscar bancas ativas
      const bancasResult = await pool.query(`
        SELECT id, name, full_name
        FROM bancas
        WHERE is_active = true
        ORDER BY name
      `);
      
      const bancas = bancasResult.rows;
      const results = [];
      
      // Executar scraper de cada banca
      for (const banca of bancas) {
        try {
          console.log(`[Public Scrapers] Executando scraper: ${banca.name}`);
          
          // Importar adapter dinamicamente
          let adapter;
          try {
            adapter = await import(`../workers/adapters/bancas/${banca.name}.js`);
          } catch (importError) {
            console.log(`[Public Scrapers] Adapter não encontrado para: ${banca.name}`);
            results.push({
              banca: banca.name,
              success: false,
              error: 'Adapter não implementado'
            });
            continue;
          }
          
          // Executar scraper
          const result = await adapter.run();
          
          results.push({
            banca: banca.name,
            success: !result.error,
            concursos_encontrados: result.found || 0,
            error: result.error || null
          });
          
          console.log(`[Public Scrapers] ${banca.name}: ${result.found || 0} concursos`);
          
        } catch (bancaError) {
          console.error(`[Public Scrapers] Erro em ${banca.name}:`, bancaError);
          results.push({
            banca: banca.name,
            success: false,
            error: bancaError instanceof Error ? bancaError.message : 'Erro desconhecido'
          });
        }
      }
      
      const totalEncontrados = results.reduce((sum, r) => sum + (r.concursos_encontrados || 0), 0);
      const sucessos = results.filter(r => r.success).length;
      
      return reply.send({
        success: true,
        message: `Scrapers executados: ${sucessos}/${bancas.length} com sucesso`,
        total_concursos_encontrados: totalEncontrados,
        bancas_processadas: bancas.length,
        results
      });
    } catch (error) {
      console.error('[Public Run Scrapers] ❌ Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  /**
   * Rota para extrair URLs de editais dos concursos
   */
  fastify.post('/public/extract-editais', async (req, reply) => {
    try {
      console.log('[Public Extract Editais] Iniciando extração...');
      
      const result = await extractAllEditalUrls();
      
      return reply.send({
        success: true,
        message: `Extração concluída: ${result.extracted}/${result.total} editais encontrados`,
        total: result.total,
        extracted: result.extracted,
        failed: result.failed,
        results: result.results
      });
    } catch (error) {
      console.error('[Public Extract Editais] ❌ Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  /**
   * Rota para listar concursos sem edital
   */
  fastify.get('/public/list-without-edital', async (req, reply) => {
    try {
      const result = await pool.query(`
        SELECT c.id, c.name, c.banca_id, b.display_name as banca_nome, c.edital_url, c.created_at
        FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        WHERE b.is_active = true
          AND (c.edital_url IS NULL OR c.edital_url = '')
        ORDER BY c.created_at DESC
        LIMIT 50
      `);
      
      return reply.send({
        success: true,
        total: result.rows.length,
        concursos: result.rows
      });
    } catch (error) {
      console.error('[Public List] ❌ Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}
