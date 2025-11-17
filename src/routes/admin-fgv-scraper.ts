import { FastifyInstance } from 'fastify';
import { FgvScraper } from '../services/scrapers/fgv-scraper.js';
import { db } from '../db/index.js';

export async function adminFgvScraperRoutes(fastify: FastifyInstance) {
  // Testar scraper FGV (sem salvar)
  fastify.post('/admin/fgv/test', async (request, reply) => {
    const scraper = new FgvScraper();
    
    try {
      const concursos = await scraper.scrapeWithEditais(5); // Limitar a 5 para teste
      
      return {
        status: 'success',
        found: concursos.length,
        concursos
      };
    } catch (error: any) {
      return reply.status(500).send({
        status: 'error',
        message: error.message
      });
    } finally {
      await scraper.close();
    }
  });

  // Scraper FGV completo (salvar no banco)
  fastify.post('/admin/fgv/scrape', async (request, reply) => {
    const scraper = new FgvScraper();
    
    try {
      const concursos = await scraper.scrapeWithEditais(20); // Limitar a 20
      
      let saved = 0;
      let rejected = 0;

      for (const concurso of concursos) {
        try {
          // Verificar se já existe
          const existing = await db('concursos')
            .where({ name: concurso.name })
            .first();

          if (existing) {
            rejected++;
            continue;
          }

          // Salvar
          await db('concursos').insert({
            name: concurso.name,
            slug: concurso.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            banca: 'FGV',
            banca_id: 54, // ID da FGV
            contest_url: concurso.url,
            edital_url: concurso.editalUrl || null,
            created_at: new Date()
          });

          saved++;
        } catch (err) {
          console.error(`Erro ao salvar ${concurso.name}:`, err);
          rejected++;
        }
      }

      return {
        status: 'success',
        found: concursos.length,
        saved,
        rejected
      };
    } catch (error: any) {
      return reply.status(500).send({
        status: 'error',
        message: error.message
      });
    } finally {
      await scraper.close();
    }
  });
}
