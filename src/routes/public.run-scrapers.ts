import { pool } from '../db/connection.js';

/**
 * ROTA PÚBLICA TEMPORÁRIA - REMOVER APÓS USO
 * Esta rota permite verificar status dos concursos sem autenticação
 * APENAS PARA TESTE - NÃO USAR EM PRODUÇÃO
 */
export default async function publicRunScrapersRoutes(fastify, options) {
  
  /**
   * Rota para verificar status dos concursos
   */
  fastify.get('/public/check-status', async (req, reply) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(edital_url) as com_url,
          COUNT(*) - COUNT(edital_url) as sem_url
        FROM concursos
      `);
      
      return reply.send({
        success: true,
        statistics: {
          total_concursos: parseInt(result.rows[0].total),
          com_edital_url: parseInt(result.rows[0].com_url),
          sem_edital_url: parseInt(result.rows[0].sem_url)
        }
      });
    } catch (error) {
      console.error('[Public Check Status] ❌ Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  /**
   * Rota para listar concursos sem edital
   */
  fastify.get('/public/list-without-edital', async (req, reply) => {
    try {
      const result = await pool.query(`
        SELECT c.id, c.nome, c.banca_id, b.nome as banca_nome, c.edital_url, c.created_at
        FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        WHERE b.is_active = true
          AND (c.edital_url IS NULL OR c.edital_url = '')
        ORDER BY c.created_at DESC
        LIMIT 50
      `);
      
      return reply.send({
        success: true,
        total: result.rows.length,
        concursos: result.rows
      });
    } catch (error) {
      console.error('[Public List] ❌ Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}
