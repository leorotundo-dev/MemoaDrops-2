import type { FastifyInstance } from 'fastify';
import { scrapeBancaContests, saveDiscoveredContests, updateBancaContestCount, scrapeAllBancasContests } from '../services/contest-discovery-scraper.js';

export default async function (app: FastifyInstance) {
  /**
   * POST /admin/scrape-contests/:bancaId
   * Executa scraper de descoberta de concursos para uma banca específica
   */
  app.post('/admin/scrape-contests/:bancaId', async (request, reply) => {
    const { bancaId } = request.params as { bancaId: string };
    
    try {
      console.log(`[Scrape Contests] Iniciando scraping para banca ${bancaId}...`);
      
      const contests = await scrapeBancaContests(parseInt(bancaId));
      const saved = await saveDiscoveredContests(contests);
      await updateBancaContestCount(parseInt(bancaId));
      
      return reply.send({ 
        success: true, 
        message: `Scraping concluído para banca ${bancaId}`,
        found: contests.length,
        saved: saved
      });
      
    } catch (error) {
      console.error(`[Scrape Contests] Erro ao executar scraping:`, error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Erro ao executar scraping',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /admin/scrape-contests/all
   * Executa scraper de descoberta de concursos para todas as bancas ativas
   */
  app.post('/admin/scrape-contests/all', async (request, reply) => {
    try {
      console.log('[Scrape Contests] Iniciando scraping de todas as bancas...');
      
      const result = await scrapeAllBancasContests();
      
      return reply.send({ 
        success: true, 
        message: 'Scraping de todas as bancas concluído',
        total_found: result.total,
        total_saved: result.saved
      });
      
    } catch (error) {
      console.error('[Scrape Contests] Erro ao executar scraping de todas as bancas:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Erro ao executar scraping',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
