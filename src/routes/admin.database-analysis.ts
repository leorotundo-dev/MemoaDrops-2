import { FastifyInstance } from 'fastify';
import { pool } from '../db/index.js';

export async function adminDatabaseAnalysisRoutes(app: FastifyInstance) {
  
  // Analisar URLs inválidos no banco
  app.get('/admin/database/analyze-invalid-urls', async (request, reply) => {
    try {
      console.log('[DB Analysis] Iniciando análise de URLs inválidos...');
      
      const invalidPatterns = [
        '%lista%espera%',
        '%anula%',
        '%comunicado%',
        '%resultado%',
        '%gabarito%',
        '%homologa%',
        '%retifica%',
        '%lgpd%',
        '%termos%uso%',
        '%liminar%',
        '%judicial%',
        '%boletim%',
        '%suplementar%',
        '%cronograma%',
        '%convoca%',
        '%classifica%',
        '%nomea%',
        '%prorroga%',
        '%suspens%',
        '%cancelamento%',
        '%adiamento%',
        '%altera%',
        '%errata%',
        '%aviso%',
        '%republica%',
        '%ratifica%',
        '%ata%',
        '%recurso%',
        '%impugna%',
        '%adendo%'
      ];
      
      // 1. Estatísticas gerais
      const { rows: stats } = await pool.query(`
        SELECT 
          COUNT(*) as total_concursos,
          COUNT(edital_url) as com_edital_url,
          COUNT(CASE WHEN edital_url IS NULL OR edital_url = '' THEN 1 END) as sem_edital_url
        FROM concursos
      `);
      
      // 2. Contar URLs inválidos
      const whereConditions = invalidPatterns.map(() => 'LOWER(edital_url) LIKE ?').join(' OR ');
      const { rows: invalidCount } = await pool.query(`
        SELECT 
          COUNT(*) as total_invalidos,
          COUNT(DISTINCT banca_id) as bancas_afetadas
        FROM concursos
        WHERE edital_url IS NOT NULL 
          AND edital_url != ''
          AND (${whereConditions.replace(/\?/g, (match, offset) => `$${Math.floor(offset / 23) + 1}`)})
      `, invalidPatterns);
      
      // 3. URLs inválidos por banca
      const { rows: bancasAffected } = await pool.query(`
        SELECT 
          b.name as banca,
          b.display_name,
          COUNT(*) as total_concursos,
          COUNT(CASE WHEN c.edital_url IS NOT NULL AND c.edital_url != '' THEN 1 END) as com_url,
          COUNT(CASE 
            WHEN c.edital_url IS NOT NULL 
              AND c.edital_url != ''
              AND (
                LOWER(c.edital_url) LIKE '%lista%espera%' OR
                LOWER(c.edital_url) LIKE '%anula%' OR
                LOWER(c.edital_url) LIKE '%comunicado%' OR
                LOWER(c.edital_url) LIKE '%resultado%' OR
                LOWER(c.edital_url) LIKE '%retifica%'
              )
            THEN 1 
          END) as urls_invalidos
        FROM bancas b
        LEFT JOIN concursos c ON c.banca_id = b.id
        WHERE b.is_active = true
        GROUP BY b.id, b.name, b.display_name
        HAVING COUNT(c.id) > 0
        ORDER BY urls_invalidos DESC
        LIMIT 10
      `);
      
      // 4. Exemplos de URLs inválidos
      const { rows: examples } = await pool.query(`
        SELECT 
          c.id,
          c.name as concurso,
          b.name as banca,
          c.edital_url,
          c.created_at
        FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        WHERE c.edital_url IS NOT NULL 
          AND c.edital_url != ''
          AND (
            LOWER(c.edital_url) LIKE '%lista%espera%' OR
            LOWER(c.edital_url) LIKE '%anula%' OR
            LOWER(c.edital_url) LIKE '%comunicado%' OR
            LOWER(c.edital_url) LIKE '%resultado%' OR
            LOWER(c.edital_url) LIKE '%retifica%'
          )
        ORDER BY c.created_at DESC
        LIMIT 10
      `);
      
      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        statistics: stats[0],
        invalid_urls: invalidCount[0],
        bancas_affected: bancasAffected,
        examples: examples,
        summary: {
          total_concursos: parseInt(stats[0].total_concursos),
          com_url: parseInt(stats[0].com_edital_url),
          urls_invalidos: parseInt(invalidCount[0].total_invalidos),
          percentual_invalido: (
            (parseInt(invalidCount[0].total_invalidos) / parseInt(stats[0].com_edital_url)) * 100
          ).toFixed(2) + '%'
        }
      };
      
      console.log('[DB Analysis] Análise concluída:', result.summary);
      
      return result;
      
    } catch (error: any) {
      console.error('[DB Analysis] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  // Limpar URLs inválidos (marcar como NULL)
  app.post('/admin/database/clean-invalid-urls', async (request, reply) => {
    try {
      console.log('[DB Clean] Iniciando limpeza de URLs inválidos...');
      
      // Backup: contar antes
      const { rows: beforeCount } = await pool.query(`
        SELECT COUNT(*) as total
        FROM concursos
        WHERE edital_url IS NOT NULL 
          AND edital_url != ''
          AND (
            LOWER(edital_url) LIKE '%lista%espera%' OR
            LOWER(edital_url) LIKE '%anula%' OR
            LOWER(edital_url) LIKE '%comunicado%' OR
            LOWER(edital_url) LIKE '%resultado%' OR
            LOWER(edital_url) LIKE '%gabarito%' OR
            LOWER(edital_url) LIKE '%homologa%' OR
            LOWER(edital_url) LIKE '%retifica%' OR
            LOWER(edital_url) LIKE '%lgpd%' OR
            LOWER(edital_url) LIKE '%termos%uso%' OR
            LOWER(edital_url) LIKE '%liminar%' OR
            LOWER(edital_url) LIKE '%judicial%' OR
            LOWER(edital_url) LIKE '%boletim%' OR
            LOWER(edital_url) LIKE '%suplementar%' OR
            LOWER(edital_url) LIKE '%cronograma%' OR
            LOWER(edital_url) LIKE '%convoca%' OR
            LOWER(edital_url) LIKE '%classifica%' OR
            LOWER(edital_url) LIKE '%nomea%' OR
            LOWER(edital_url) LIKE '%prorroga%' OR
            LOWER(edital_url) LIKE '%suspens%' OR
            LOWER(edital_url) LIKE '%cancelamento%' OR
            LOWER(edital_url) LIKE '%adiamento%' OR
            LOWER(edital_url) LIKE '%altera%' OR
            LOWER(edital_url) LIKE '%errata%' OR
            LOWER(edital_url) LIKE '%aviso%' OR
            LOWER(edital_url) LIKE '%republica%' OR
            LOWER(edital_url) LIKE '%ratifica%' OR
            LOWER(edital_url) LIKE '%ata%' OR
            LOWER(edital_url) LIKE '%recurso%' OR
            LOWER(edital_url) LIKE '%impugna%' OR
            LOWER(edital_url) LIKE '%adendo%'
          )
      `);
      
      console.log(`[DB Clean] URLs inválidos encontrados: ${beforeCount[0].total}`);
      
      // Executar UPDATE para setar como NULL
      const { rowCount } = await pool.query(`
        UPDATE concursos
        SET edital_url = NULL
        WHERE edital_url IS NOT NULL 
          AND edital_url != ''
          AND (
            LOWER(edital_url) LIKE '%lista%espera%' OR
            LOWER(edital_url) LIKE '%anula%' OR
            LOWER(edital_url) LIKE '%comunicado%' OR
            LOWER(edital_url) LIKE '%resultado%' OR
            LOWER(edital_url) LIKE '%gabarito%' OR
            LOWER(edital_url) LIKE '%homologa%' OR
            LOWER(edital_url) LIKE '%retifica%' OR
            LOWER(edital_url) LIKE '%lgpd%' OR
            LOWER(edital_url) LIKE '%termos%uso%' OR
            LOWER(edital_url) LIKE '%liminar%' OR
            LOWER(edital_url) LIKE '%judicial%' OR
            LOWER(edital_url) LIKE '%boletim%' OR
            LOWER(edital_url) LIKE '%suplementar%' OR
            LOWER(edital_url) LIKE '%cronograma%' OR
            LOWER(edital_url) LIKE '%convoca%' OR
            LOWER(edital_url) LIKE '%classifica%' OR
            LOWER(edital_url) LIKE '%nomea%' OR
            LOWER(edital_url) LIKE '%prorroga%' OR
            LOWER(edital_url) LIKE '%suspens%' OR
            LOWER(edital_url) LIKE '%cancelamento%' OR
            LOWER(edital_url) LIKE '%adiamento%' OR
            LOWER(edital_url) LIKE '%altera%' OR
            LOWER(edital_url) LIKE '%errata%' OR
            LOWER(edital_url) LIKE '%aviso%' OR
            LOWER(edital_url) LIKE '%republica%' OR
            LOWER(edital_url) LIKE '%ratifica%' OR
            LOWER(edital_url) LIKE '%ata%' OR
            LOWER(edital_url) LIKE '%recurso%' OR
            LOWER(edital_url) LIKE '%impugna%' OR
            LOWER(edital_url) LIKE '%adendo%'
          )
      `);
      
      console.log(`[DB Clean] URLs limpos: ${rowCount}`);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        urls_found: parseInt(beforeCount[0].total),
        urls_cleaned: rowCount,
        message: `${rowCount} URLs inválidos foram marcados como NULL`
      };
      
    } catch (error: any) {
      console.error('[DB Clean] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
}
