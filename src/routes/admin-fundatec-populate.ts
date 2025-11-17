import { FastifyInstance } from 'fastify';
import { FundatecUrlExtractor } from '../services/scrapers/fundatec-url-extractor.js';
import { db } from '../db/index.js';

export async function adminFundatecPopulateRoutes(fastify: FastifyInstance) {
  fastify.post('/admin/fundatec/populate-urls', async (request, reply) => {
    try {
      // Buscar concursos FUNDATEC sem edital_url
      const concursos = await db('concursos')
        .where({ banca: 'FUNDATEC' })
        .whereNull('edital_url')
        .select('id', 'name', 'contest_url');

      if (concursos.length === 0) {
        return { status: 'success', message: 'Nenhum concurso FUNDATEC sem edital_url', processed: 0 };
      }

      const extractor = new FundatecUrlExtractor();
      let success = 0;
      let failed = 0;

      for (const concurso of concursos) {
        try {
          const editalUrl = await extractor.extractEditalUrl(concurso.contest_url);
          
          if (editalUrl) {
            await db('concursos')
              .where({ id: concurso.id })
              .update({ edital_url: editalUrl });
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      return {
        status: 'success',
        total: concursos.length,
        success,
        failed
      };
    } catch (error: any) {
      return reply.status(500).send({
        status: 'error',
        message: error.message
      });
    }
  });
}
