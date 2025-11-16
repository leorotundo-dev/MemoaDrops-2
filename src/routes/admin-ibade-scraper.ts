import { FastifyInstance } from 'fastify';
import { IbadeScraper } from '../services/scrapers/ibade-scraper.js';
import { pool } from '../db/connection.js';

export async function adminIbadeScraperRoutes(app: FastifyInstance) {
  
  /**
   * POST /admin/ibade/scrape
   * Scrape IBADE e salva concursos
   */
  app.post('/admin/ibade/scrape', async (request, reply) => {
    try {
      const scraper = new IbadeScraper();
      
      console.log('[IBADE] Iniciando scrape...');
      const concursos = await scraper.scrapeCompleto();
      
      console.log(`[IBADE] Encontrados ${concursos.length} concursos`);

      // Buscar ID da banca IBADE
      const { rows: bancaRows } = await pool.query('SELECT * FROM bancas WHERE name = $1', ['IBADE']);
      const banca = bancaRows[0];
      
      if (!banca) {
        return reply.status(404).send({ error: 'Banca IBADE não encontrada' });
      }

      let saved = 0;
      let rejected = 0;
      const errors: string[] = [];

      for (const concurso of concursos) {
        try {
          const slug = concurso.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          // Verificar se já existe
          const { rows: existingRows } = await pool.query(
            'SELECT * FROM concursos WHERE name = $1 AND banca_id = $2',
            [concurso.name, banca.id]
          );

          if (existingRows.length > 0) {
            console.log(`[IBADE] Concurso já existe: ${concurso.name}`);
            rejected++;
            continue;
          }

          // Salvar concurso
          await pool.query(
            `INSERT INTO concursos (name, slug, banca, banca_id, contest_url, edital_url, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [concurso.name, slug, banca.name, banca.id, concurso.contestUrl, concurso.editalUrl || null]
          );

          console.log(`[IBADE] Salvo: ${concurso.name}`);
          saved++;
        } catch (error: any) {
          console.error(`[IBADE] Erro ao salvar ${concurso.name}:`, error.message);
          errors.push(`${concurso.name}: ${error.message}`);
          rejected++;
        }
      }

      return {
        success: true,
        found: concursos.length,
        saved,
        rejected,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      console.error('[IBADE] Erro no scrape:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /admin/ibade/test
   * Apenas testa o scraper sem salvar
   */
  app.post('/admin/ibade/test', async (request, reply) => {
    try {
      const scraper = new IbadeScraper();
      
      console.log('[IBADE] Testando scraper...');
      const concursos = await scraper.scrapeCompleto();
      
      return {
        success: true,
        found: concursos.length,
        concursos: concursos.map(c => ({
          name: c.name,
          contestUrl: c.contestUrl,
          hasEditalUrl: !!c.editalUrl,
          editalUrl: c.editalUrl,
        })),
      };
    } catch (error: any) {
      console.error('[IBADE] Erro no teste:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
