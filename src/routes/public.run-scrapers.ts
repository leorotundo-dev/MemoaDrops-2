import { pool } from '../db/connection.js';
import { runScraper } from '../services/scraper.js';

/**
 * ROTA PÚBLICA TEMPORÁRIA - REMOVER APÓS USO
 * Esta rota permite executar scrapers sem autenticação
 * APENAS PARA TESTE - NÃO USAR EM PRODUÇÃO
 */
export default async function publicRunScrapersRoutes(fastify, options) {
  
  fastify.get('/public/run-scrapers-temp', async (req, reply) => {
    try {
      console.log('[Public Run Scrapers] 🚀 Iniciando execução pública dos scrapers...');
      
      // Buscar concursos sem edital_url ou com edital_url inválido
      const result = await pool.query(`
        SELECT c.id, c.nome, c.banca_id, b.nome as banca_nome, c.edital_url
        FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        WHERE b.is_active = true
          AND (c.edital_url IS NULL OR c.edital_url = '')
        ORDER BY c.created_at DESC
        LIMIT 50
      `);
      
      const concursos = result.rows;
      console.log(`[Public Run Scrapers] 📊 Encontrados ${concursos.length} concursos para processar`);
      
      if (concursos.length === 0) {
        return reply.send({
          success: true,
          message: 'Nenhum concurso para processar',
          processed: 0,
          successful: 0,
          failed: 0
        });
      }
      
      let successful = 0;
      let failed = 0;
      const results = [];
      
      // Processar cada concurso
      for (const concurso of concursos) {
        try {
          console.log(`[Public Run Scrapers] 🔍 Processando: ${concurso.nome} (${concurso.banca_nome})`);
          
          const result = await runScraper({
            concursoId: concurso.id,
            bancaId: concurso.banca_id,
            concursoNome: concurso.nome,
            bancaNome: concurso.banca_nome
          });
          
          if (result.success) {
            successful++;
            console.log(`[Public Run Scrapers] ✅ Sucesso: ${concurso.nome}`);
            results.push({
              concurso: concurso.nome,
              status: 'success',
              edital_url: result.edital_url
            });
          } else {
            failed++;
            console.log(`[Public Run Scrapers] ❌ Falha: ${concurso.nome} - ${result.error}`);
            results.push({
              concurso: concurso.nome,
              status: 'failed',
              error: result.error
            });
          }
        } catch (error) {
          failed++;
          console.error(`[Public Run Scrapers] ❌ Erro ao processar ${concurso.nome}:`, error);
          results.push({
            concurso: concurso.nome,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      console.log(`[Public Run Scrapers] 🎉 Concluído! Sucesso: ${successful}, Falhas: ${failed}`);
      
      return reply.send({
        success: true,
        message: `Scrapers executados com sucesso!`,
        processed: concursos.length,
        successful,
        failed,
        results: results.slice(0, 10) // Retornar apenas os primeiros 10 para não sobrecarregar
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
   * Rota para verificar status
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
}
