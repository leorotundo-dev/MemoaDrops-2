import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function clearContests(app: FastifyInstance) {
  app.post('/admin/clear-contests', async (request, reply) => {
    try {
      console.log('[Clear] Limpando todos os concursos...');
      
      // Deletar todos os concursos
      const { rowCount } = await pool.query('DELETE FROM concursos');
      
      console.log(`[Clear] ${rowCount} concursos deletados`);
      
      return {
        success: true,
        deleted: rowCount,
        message: `${rowCount} concursos foram deletados do banco de dados`
      };
      
    } catch (error: any) {
      console.error('[Clear] Erro ao limpar concursos:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
}
