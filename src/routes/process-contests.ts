import type { FastifyInstance } from 'fastify';
import { processContest } from '../services/contest-data-extractor.js';
import pool from '../db/pool.js';

export default async function (app: FastifyInstance) {
  /**
   * POST /admin/process-contest/:contestId
   * Processa um concurso específico (extrai dados da URL)
   */
  app.post('/admin/process-contest/:contestId', async (request, reply) => {
    const { contestId } = request.params as { contestId: string };
    
    try {
      console.log(`[Process Contest] Processando concurso ${contestId}...`);
      
      const success = await processContest(contestId);
      
      if (success) {
        return reply.send({ 
          success: true, 
          message: `Concurso ${contestId} processado com sucesso`
        });
      } else {
        return reply.code(400).send({ 
          success: false, 
          error: 'Não foi possível processar o concurso'
        });
      }
      
    } catch (error) {
      console.error(`[Process Contest] Erro ao processar concurso:`, error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Erro ao processar concurso',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /admin/process-contests/batch
   * Processa múltiplos concursos em lote
   */
  app.post('/admin/process-contests/batch', async (request, reply) => {
    const { limit = 10 } = (request.body || {}) as { limit?: number };
    
    try {
      console.log(`[Process Contest] Processando até ${limit} concursos...`);
      
      // Buscar concursos que ainda não foram processados (sem salário, vagas, etc)
      const { rows: contests } = await pool.query(`
        SELECT id, name, contest_url
        FROM concursos
        WHERE contest_url IS NOT NULL
          AND (salario IS NULL OR numero_vagas IS NULL OR data_prova IS NULL)
        LIMIT $1
      `, [limit]);

      console.log(`[Process Contest] Encontrados ${contests.length} concursos para processar`);

      let processed = 0;
      let failed = 0;

      for (const contest of contests) {
        try {
          const success = await processContest(contest.id);
          if (success) {
            processed++;
          } else {
            failed++;
          }
          
          // Aguardar 2 segundos entre requests para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`[Process Contest] Erro ao processar ${contest.id}:`, error);
          failed++;
        }
      }

      return reply.send({ 
        success: true, 
        message: `Processamento em lote concluído`,
        total: contests.length,
        processed,
        failed
      });
      
    } catch (error) {
      console.error(`[Process Contest] Erro no processamento em lote:`, error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Erro no processamento em lote',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
