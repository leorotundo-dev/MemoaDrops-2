import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';

/**
 * Rota temporária para executar SQL direto
 * USAR COM CUIDADO!
 */
const adminExecSqlRoutes: FastifyPluginAsync = async (fastify) => {
  
  // POST /admin/exec-sql - Executar SQL direto
  fastify.post('/admin/exec-sql', async (request, reply) => {
    try {
      const { sql } = request.body as { sql: string };
      
      if (!sql) {
        return reply.status(400).send({ error: 'SQL é obrigatório' });
      }
      
      // Executar SQL
      const result = await db.raw(sql);
      
      return {
        success: true,
        rows: result.rows || [],
        rowCount: result.rowCount || 0
      };
      
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: error.message,
        detail: error.detail || null
      });
    }
  });
  
};

export default adminExecSqlRoutes;
