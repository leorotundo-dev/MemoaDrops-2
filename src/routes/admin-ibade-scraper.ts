import { Router } from 'express';
import { IbadeScraper } from '../services/scrapers/ibade-scraper';
import { db } from '../db/connection';
import slugify from 'slugify';

const router = Router();

/**
 * POST /admin/ibade/scrape
 * Scrape IBADE e salva concursos
 */
router.post('/admin/ibade/scrape', async (req, res) => {
  try {
    const scraper = new IbadeScraper();
    
    console.log('[IBADE] Iniciando scrape...');
    const concursos = await scraper.scrapeCompleto();
    
    console.log(`[IBADE] Encontrados ${concursos.length} concursos`);

    // Buscar ID da banca IBADE
    const banca = await db('bancas').where({ name: 'IBADE' }).first();
    
    if (!banca) {
      return res.status(404).json({ error: 'Banca IBADE não encontrada' });
    }

    let saved = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (const concurso of concursos) {
      try {
        const slug = slugify(concurso.name, { lower: true, strict: true });

        // Verificar se já existe
        const existing = await db('concursos')
          .where({ name: concurso.name, banca_id: banca.id })
          .first();

        if (existing) {
          console.log(`[IBADE] Concurso já existe: ${concurso.name}`);
          rejected++;
          continue;
        }

        // Salvar concurso
        await db('concursos').insert({
          name: concurso.name,
          slug,
          banca: banca.name,
          banca_id: banca.id,
          contest_url: concurso.contestUrl,
          edital_url: concurso.editalUrl || null,
          created_at: new Date(),
        });

        console.log(`[IBADE] Salvo: ${concurso.name}`);
        saved++;
      } catch (error: any) {
        console.error(`[IBADE] Erro ao salvar ${concurso.name}:`, error.message);
        errors.push(`${concurso.name}: ${error.message}`);
        rejected++;
      }
    }

    res.json({
      success: true,
      found: concursos.length,
      saved,
      rejected,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[IBADE] Erro no scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /admin/ibade/test
 * Apenas testa o scraper sem salvar
 */
router.post('/admin/ibade/test', async (req, res) => {
  try {
    const scraper = new IbadeScraper();
    
    console.log('[IBADE] Testando scraper...');
    const concursos = await scraper.scrapeCompleto();
    
    res.json({
      success: true,
      found: concursos.length,
      concursos: concursos.map(c => ({
        name: c.name,
        contestUrl: c.contestUrl,
        hasEditalUrl: !!c.editalUrl,
        editalUrl: c.editalUrl,
      })),
    });
  } catch (error: any) {
    console.error('[IBADE] Erro no teste:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
