import { FastifyInstance } from 'fastify';
import { scrapeCebraspe } from '../services/scrapers/cebraspe-scraper.js';
import { scrapeFundatec } from '../services/scrapers/fundatec-scraper.js';
import { scrapeFgv } from '../services/scrapers/fgv-scraper.js';
import { scrapeIbade } from '../services/scrapers/ibade-scraper.js';
import { populateFundatecUrls } from '../services/scrapers/fundatec-url-extractor.js';

export async function adminScrapersRoutes(app: FastifyInstance) {
  
  // ============================================
  // SCRAPERS DE BANCAS (Novos)
  // ============================================
  
  // Scraper Cebraspe
  app.get('/admin/scrapers/cebraspe', async (request, reply) => {
    try {
      const concursos = await scrapeCebraspe();
      return { 
        success: true, 
        banca: 'Cebraspe',
        total: concursos.length,
        concursos 
      };
    } catch (error: any) {
      console.error('Erro no scraper Cebraspe:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Scraper FUNDATEC
  app.get('/admin/scrapers/fundatec', async (request, reply) => {
    try {
      const concursos = await scrapeFundatec();
      return { 
        success: true, 
        banca: 'FUNDATEC',
        total: concursos.length,
        concursos 
      };
    } catch (error: any) {
      console.error('Erro no scraper FUNDATEC:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Scraper FGV
  app.get('/admin/scrapers/fgv', async (request, reply) => {
    try {
      const concursos = await scrapeFgv();
      return { 
        success: true, 
        banca: 'FGV',
        total: concursos.length,
        concursos 
      };
    } catch (error: any) {
      console.error('Erro no scraper FGV:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Scraper IBADE
  app.get('/admin/scrapers/ibade', async (request, reply) => {
    try {
      const concursos = await scrapeIbade();
      return { 
        success: true, 
        banca: 'IBADE',
        total: concursos.length,
        concursos 
      };
    } catch (error: any) {
      console.error('Erro no scraper IBADE:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // ============================================
  // EXTRACTORS E UTILITÁRIOS
  // ============================================
  
  // Extrator de URLs FUNDATEC (popular editais de concursos já existentes)
  app.post('/admin/scrapers/fundatec/populate-urls', async (request, reply) => {
    try {
      const result = await populateFundatecUrls();
      return { 
        success: true,
        ...result
      };
    } catch (error: any) {
      console.error('Erro ao popular URLs FUNDATEC:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Executar todos os scrapers em sequência
  app.get('/admin/scrapers/run-all', async (request, reply) => {
    const results: any = {
      success: true,
      bancas: []
    };
    
    // Cebraspe
    try {
      const cebraspe = await scrapeCebraspe();
      results.bancas.push({
        banca: 'Cebraspe',
        success: true,
        total: cebraspe.length
      });
    } catch (error: any) {
      results.bancas.push({
        banca: 'Cebraspe',
        success: false,
        error: error.message
      });
    }
    
    // FUNDATEC
    try {
      const fundatec = await scrapeFundatec();
      results.bancas.push({
        banca: 'FUNDATEC',
        success: true,
        total: fundatec.length
      });
    } catch (error: any) {
      results.bancas.push({
        banca: 'FUNDATEC',
        success: false,
        error: error.message
      });
    }
    
    // FGV
    try {
      const fgv = await scrapeFgv();
      results.bancas.push({
        banca: 'FGV',
        success: true,
        total: fgv.length
      });
    } catch (error: any) {
      results.bancas.push({
        banca: 'FGV',
        success: false,
        error: error.message
      });
    }
    
    // IBADE
    try {
      const ibade = await scrapeIbade();
      results.bancas.push({
        banca: 'IBADE',
        success: true,
        total: ibade.length
      });
    } catch (error: any) {
      results.bancas.push({
        banca: 'IBADE',
        success: false,
        error: error.message
      });
    }
    
    // Verificar se algum falhou
    const failures = results.bancas.filter((b: any) => !b.success);
    if (failures.length > 0) {
      results.success = false;
      results.message = `${failures.length} banca(s) falharam`;
    } else {
      results.message = 'Todos os scrapers executados com sucesso';
    }
    
    return results;
  });
  
  // Listar scrapers disponíveis
  app.get('/admin/scrapers/available', async (request, reply) => {
    return {
      scrapers: [
        { id: 'cebraspe', name: 'Cebraspe', status: 'ready', endpoint: '/admin/scrapers/cebraspe' },
        { id: 'fundatec', name: 'FUNDATEC', status: 'ready', endpoint: '/admin/scrapers/fundatec' },
        { id: 'fgv', name: 'FGV Conhecimento', status: 'ready', endpoint: '/admin/scrapers/fgv' },
        { id: 'ibade', name: 'IBADE', status: 'ready', endpoint: '/admin/scrapers/ibade' }
      ]
    };
  });
}
