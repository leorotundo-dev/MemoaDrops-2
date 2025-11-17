import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import { editalWorker } from '../workers/edital-worker.js';

/**
 * Rotas administrativas unificadas para scrapers de bancas
 * Expõe o sistema robusto de workers/adapters/bancas via API REST
 * @version 2.0 - Sistema unificado
 */
export async function adminBancasScrapersRoutes(app: FastifyInstance) {
  
  // ============================================
  // EXECUTAR SCRAPER DE UMA BANCA ESPECÍFICA
  // ============================================
  
  /**
   * POST /admin/bancas/scrapers/run/:slug
   * Executa o scraper de uma banca específica
   */
  app.post('/admin/bancas/scrapers/run/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      
      console.log(`[Admin] Executando scraper: ${slug}`);
      
      // Importar dinamicamente o adapter da banca
      let adapter;
      try {
        adapter = await import(`../workers/adapters/bancas/${slug}.js`);
      } catch (error) {
        return reply.status(404).send({ 
          success: false, 
          error: `Banca não encontrada: ${slug}`,
          available: ['cebraspe', 'fgv', 'fundatec', 'ibade', 'aocp', 'fcc', 'quadrix', 'vunesp', 'ibfc', 'idecan']
        });
      }
      
      // Executar scraper
      const startTime = Date.now();
      const result = await adapter.run();
      const executionTime = Date.now() - startTime;
      
      // Verificar se houve erro
      if (result.error) {
        console.error(`[Admin] Erro no scraper ${slug}:`, result.error);
        return reply.status(500).send({
          success: false,
          banca: slug,
          error: result.error,
          execution_time_ms: executionTime
        });
      }
      
      console.log(`[Admin] Scraper ${slug} concluído: ${result.found} concursos encontrados`);
      
      // Trigger automático: iniciar worker de editais se encontrou concursos
      if (result.found > 0) {
        const workerStatus = editalWorker.getStatus();
        if (!workerStatus.running) {
          console.log(`[Admin] Iniciando worker de editais automaticamente`);
          editalWorker.start().catch(err => {
            console.error('[Admin] Erro ao iniciar worker de editais:', err);
          });
        } else {
          console.log(`[Admin] Worker de editais já está rodando`);
        }
      }
      
      return {
        success: true,
        banca: slug,
        concursos_encontrados: result.found,
        execution_time_ms: executionTime,
        result
      };
    } catch (error: any) {
      console.error('[Admin] Erro ao executar scraper:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // ============================================
  // LISTAR BANCAS DISPONÍVEIS
  // ============================================
  
  /**
   * GET /admin/bancas/scrapers/available
   * Lista todas as bancas com scrapers implementados
   */
  app.get('/admin/bancas/scrapers/available', async (request, reply) => {
    try {
      // Buscar bancas do banco de dados
      const { rows: bancas } = await pool.query(`
        SELECT 
          b.id,
          b.name as slug,
          COALESCE(b.display_name, b.name) as name,
          COUNT(c.id)::int as total_concursos,
          COUNT(CASE WHEN c.edital_url IS NOT NULL AND c.edital_url != '' THEN 1 END)::int as com_edital
        FROM bancas b
        LEFT JOIN concursos c ON c.banca_id = b.id
        WHERE b.name IN ('cebraspe', 'fgv', 'fundatec', 'ibade', 'aocp', 'fcc', 'quadrix', 'vunesp', 'ibfc', 'idecan')
        GROUP BY b.id, b.name, b.display_name
        ORDER BY total_concursos DESC
      `);
      
      // Adicionar status de implementação
      const scrapersDisponiveis = bancas.map((banca: any) => ({
        id: banca.id,
        slug: banca.slug,
        name: banca.name,
        total_concursos: banca.total_concursos,
        com_edital: banca.com_edital,
        status: 'ready',
        endpoint: `/admin/bancas/scrapers/run/${banca.slug}`
      }));
      
      return {
        total: scrapersDisponiveis.length,
        scrapers: scrapersDisponiveis
      };
    } catch (error: any) {
      console.error('[Admin] Erro ao listar scrapers:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // ============================================
  // EXECUTAR TODOS OS SCRAPERS
  // ============================================
  
  /**
   * POST /admin/bancas/scrapers/run-all
   * Executa todos os scrapers em sequência
   */
  app.post('/admin/bancas/scrapers/run-all', async (request, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      const bancas = ['cebraspe', 'fgv', 'fundatec', 'ibade', 'aocp', 'fcc', 'quadrix', 'vunesp'];
      
      // Limitar número de bancas se especificado
      const bancasToRun = limit ? bancas.slice(0, parseInt(limit)) : bancas;
      
      console.log(`[Admin] Executando ${bancasToRun.length} scrapers...`);
      
      const results: any[] = [];
      let totalConcursos = 0;
      let totalErros = 0;
      
      for (const slug of bancasToRun) {
        try {
          const adapter = await import(`../workers/adapters/bancas/${slug}.js`);
          const startTime = Date.now();
          const result = await adapter.run();
          const executionTime = Date.now() - startTime;
          
          if (result.error) {
            totalErros++;
            results.push({
              banca: slug,
              success: false,
              error: result.error,
              execution_time_ms: executionTime
            });
          } else {
            totalConcursos += result.found || 0;
            results.push({
              banca: slug,
              success: true,
              concursos_encontrados: result.found,
              execution_time_ms: executionTime
            });
          }
        } catch (error: any) {
          totalErros++;
          results.push({
            banca: slug,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`[Admin] Scrapers concluídos: ${totalConcursos} concursos, ${totalErros} erros`);
      
      return {
        success: totalErros === 0,
        total_bancas: bancasToRun.length,
        total_concursos: totalConcursos,
        total_erros: totalErros,
        results
      };
    } catch (error: any) {
      console.error('[Admin] Erro ao executar scrapers:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // ============================================
  // ESTATÍSTICAS DE SCRAPERS
  // ============================================
  
  /**
   * GET /admin/bancas/scrapers/stats
   * Retorna estatísticas gerais dos scrapers
   */
  app.get('/admin/bancas/scrapers/stats', async (request, reply) => {
    try {
      const { rows: [stats] } = await pool.query(`
        SELECT 
          COUNT(DISTINCT b.id)::int as total_bancas,
          COUNT(c.id)::int as total_concursos,
          COUNT(CASE WHEN c.edital_url IS NOT NULL AND c.edital_url != '' THEN 1 END)::int as com_edital,
          COUNT(m.id)::int as com_hierarquia,
          ROUND(
            COUNT(CASE WHEN c.edital_url IS NOT NULL AND c.edital_url != '' THEN 1 END)::numeric * 100.0 / 
            NULLIF(COUNT(c.id), 0), 
            1
          ) as taxa_cobertura_edital,
          ROUND(
            COUNT(m.id)::numeric * 100.0 / 
            NULLIF(COUNT(c.id), 0), 
            1
          ) as taxa_processamento
        FROM bancas b
        LEFT JOIN concursos c ON c.banca_id = b.id
        LEFT JOIN materias m ON m.contest_id = c.id
        WHERE b.name IN ('cebraspe', 'fgv', 'fundatec', 'ibade', 'aocp', 'fcc', 'quadrix', 'vunesp', 'ibfc', 'idecan')
      `);
      
      return {
        total_bancas: stats.total_bancas || 0,
        total_concursos: stats.total_concursos || 0,
        com_edital: stats.com_edital || 0,
        com_hierarquia: stats.com_hierarquia || 0,
        taxa_cobertura_edital: parseFloat(stats.taxa_cobertura_edital || '0'),
        taxa_processamento: parseFloat(stats.taxa_processamento || '0')
      };
    } catch (error: any) {
      console.error('[Admin] Erro ao buscar stats:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // ============================================
  // HISTÓRICO DE EXECUÇÕES
  // ============================================
  
  /**
   * GET /admin/bancas/scrapers/history
   * Retorna histórico de execuções de scrapers (últimas 50)
   */
  app.get('/admin/bancas/scrapers/history', async (request, reply) => {
    try {
      // TODO: Implementar tabela de logs de scrapers
      // Por enquanto, retornar dados mockados
      return {
        message: 'Histórico de scrapers não implementado ainda',
        note: 'Implementar tabela scraper_execution_logs'
      };
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
