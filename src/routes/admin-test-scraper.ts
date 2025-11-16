import { FastifyInstance } from 'fastify';
import { scrapeBancaContests, saveDiscoveredContests, updateBancaContestCount } from '../services/contest-discovery-scraper.js';

export async function adminTestScraperRoutes(app: FastifyInstance) {
  
  // Testar novo scraper com validação
  app.post('/admin/test-scraper/:bancaId', async (request, reply) => {
    try {
      const { bancaId } = request.params as { bancaId: string };
      const bancaIdNum = parseInt(bancaId);
      
      console.log(`[Test Scraper] Executando scraper para banca ${bancaIdNum}`);
      
      // Buscar concursos
      const contests = await scrapeBancaContests(bancaIdNum);
      console.log(`[Test Scraper] Encontrados ${contests.length} concursos`);
      
      // Salvar concursos (modo rápido sem validação de PDF)
      const savedCount = await saveDiscoveredContests(contests, { skipPdfValidation: true });
      
      // Atualizar contador
      await updateBancaContestCount(bancaIdNum);
      
      return {
        success: true,
        bancaId: bancaIdNum,
        found: contests.length,
        saved: savedCount,
        rejected: contests.length - savedCount,
        contests: contests.map(c => ({
          nome: c.nome,
          url: c.contest_url || c.dou_url,
        })),
      };
    } catch (error: any) {
      console.error('[Test Scraper] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
}
