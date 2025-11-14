import { FastifyInstance } from 'fastify';
import * as fgv from '../workers/adapters/bancas/fgv.js';
import * as cebraspe from '../workers/adapters/bancas/cebraspe.js';
import * as vunesp from '../workers/adapters/bancas/vunesp.js';

export async function adminScrapersRoutes(app: FastifyInstance) {
  
  // Executar scraper de uma banca específica
  app.post('/admin/scrapers/run/:banca', async (request, reply) => {
    try {
      const { banca } = request.params as { banca: string };
      
      console.log(`[Scraper] Executando scraper: ${banca}`);
      
      let result;
      switch (banca.toLowerCase()) {
        case 'fgv':
          result = await fgv.run();
          break;
        case 'cebraspe':
          result = await cebraspe.run();
          break;
        case 'vunesp':
          result = await vunesp.run();
          break;
        default:
          return reply.status(400).send({ error: `Banca não suportada: ${banca}` });
      }
      
      return {
        success: true,
        banca,
        result
      };
    } catch (error: any) {
      console.error('[Scraper] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  // Listar scrapers disponíveis
  app.get('/admin/scrapers/available', async (request, reply) => {
    return {
      scrapers: [
        { id: 'fgv', name: 'FGV Conhecimento', status: 'ready' },
        { id: 'cebraspe', name: 'Cebraspe', status: 'ready' },
        { id: 'vunesp', name: 'Vunesp', status: 'ready' }
      ]
    };
  });
}
