import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../db/pool.js';
import { logger } from '../logger.js';

export const publicCleanGenericContestsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/public/clean-generic-contests', async (request, reply) => {
    try {
      logger.info('[CleanGenericContests] Iniciando limpeza de concursos genéricos');
      
      // Lista de padrões genéricos para deletar
      const genericPatterns = [
        'Inscrições abertas',
        'Ir para',
        'Todos os',
        'Passe o mouse',
        'Concursos',
        'Ver mais',
        'Saiba mais',
        'Clique aqui',
        'Acessar',
        'Voltar',
        'Próximo',
        'Anterior',
        'Menu',
        'Home',
        'Início'
      ];
      
      // Construir query para deletar concursos com nomes genéricos
      const conditions = genericPatterns.map((_, i) => `name ILIKE $${i + 1}`).join(' OR ');
      const params = genericPatterns.map(p => `%${p}%`);
      
      // Contar quantos serão deletados
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM concursos WHERE ${conditions}`,
        params
      );
      const totalToDelete = parseInt(countResult.rows[0]?.total || '0');
      
      // Deletar
      const deleteResult = await pool.query(
        `DELETE FROM concursos WHERE ${conditions} RETURNING id`,
        params
      );
      
      const deletedCount = deleteResult.rowCount || 0;
      
      logger.info(`[CleanGenericContests] Deletados ${deletedCount} concursos genéricos`);
      
      return reply.send({
        success: true,
        message: `Limpeza concluída: ${deletedCount} concursos genéricos removidos`,
        total_deleted: deletedCount,
        patterns_used: genericPatterns.length
      });
      
    } catch (error: unknown) {
      logger.error('[CleanGenericContests] Erro ao limpar concursos:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};
