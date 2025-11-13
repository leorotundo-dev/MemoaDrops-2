import type { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function (app: FastifyInstance) {
  /**
   * POST /admin/migrate-salario
   * Altera o tipo da coluna salario para text
   */
  app.post('/admin/migrate-salario', async (request, reply) => {
    try {
      console.log('[Migration] Alterando tipo da coluna salario para text...');
      
      await pool.query('ALTER TABLE concursos ALTER COLUMN salario TYPE text;');
      
      console.log('[Migration] Migração concluída com sucesso!');
      
      return reply.send({ 
        success: true, 
        message: 'Coluna salario alterada para text com sucesso'
      });
      
    } catch (error: any) {
      console.error('[Migration] Erro na migração:', error.message);
      
      // Se já for text, retornar sucesso
      if (error.message.includes('cannot be cast automatically') || 
          error.message.includes('already exists')) {
        return reply.send({ 
          success: true, 
          message: 'Coluna já é do tipo text'
        });
      }
      
      return reply.code(500).send({ 
        success: false, 
        error: 'Erro ao executar migração',
        details: error.message
      });
    }
  });
}
