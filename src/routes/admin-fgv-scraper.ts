import { FastifyInstance } from 'fastify';
import { FgvScraper } from '../services/scrapers/fgv-scraper.js';
import { db } from '../db/index';

export async function adminFgvScraperRoutes(fastify: FastifyInstance) {
  // Testar scraper FGV (sem salvar)
  fastify.post('/admin/fgv/test', async (request, reply) => {
    try {
      const scraper = new FgvScraper();
      const concursos = await scraper.scrapeComEditais();

      return {
        success: true,
        total: concursos.length,
        comEdital: concursos.filter(c => c.editalUrl).length,
        semEdital: concursos.filter(c => !c.editalUrl).length,
        concursos: concursos.map(c => ({
          name: c.name,
          url: c.url,
          editalUrl: c.editalUrl || null
        }))
      };
    } catch (error: any) {
      console.error('Erro ao testar scraper FGV:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Executar scraper FGV e salvar no banco
  fastify.post('/admin/fgv/scrape', async (request, reply) => {
    try {
      const scraper = new FgvScraper();
      const concursos = await scraper.scrapeComEditais();

      // Buscar ID da banca FGV
      const banca = await db('bancas')
        .where({ slug: 'fgv' })
        .first();

      if (!banca) {
        return reply.status(404).send({
          success: false,
          error: 'Banca FGV não encontrada'
        });
      }

      let salvos = 0;
      let rejeitados = 0;
      const erros: string[] = [];

      for (const concurso of concursos) {
        try {
          // Gerar slug
          const slug = concurso.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          // Verificar se já existe
          const existe = await db('concursos')
            .where({ slug })
            .orWhere({ contest_url: concurso.url })
            .first();

          if (existe) {
            console.log(`Concurso já existe: ${concurso.name}`);
            rejeitados++;
            continue;
          }

          // Salvar concurso
          await db('concursos').insert({
            name: concurso.name,
            slug,
            banca: 'FGV',
            banca_id: banca.id,
            contest_url: concurso.url,
            edital_url: concurso.editalUrl || null,
            created_at: new Date(),
            updated_at: new Date()
          });

          console.log(`Concurso salvo: ${concurso.name}`);
          salvos++;

        } catch (error: any) {
          console.error(`Erro ao salvar concurso ${concurso.name}:`, error);
          erros.push(`${concurso.name}: ${error.message}`);
          rejeitados++;
        }
      }

      return {
        success: true,
        total: concursos.length,
        salvos,
        rejeitados,
        erros: erros.length > 0 ? erros : undefined
      };

    } catch (error: any) {
      console.error('Erro ao executar scraper FGV:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
