import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function debugContests(app: FastifyInstance) {
  app.get('/admin/debug-contests', async (request, reply) => {
    try {
      // Buscar todas as bancas com seus nomes e IDs
      const { rows: bancas } = await pool.query(`
        SELECT id, name
        FROM bancas
        ORDER BY id
      `);
      
      // Buscar todos os concursos com seus banca_ids
      const { rows: concursos } = await pool.query(`
        SELECT id, nome, banca_id
        FROM concursos
        ORDER BY banca_id, id
      `);
      
      // Agrupar concursos por banca_id
      const concursosPorBanca: Record<number, any[]> = {};
      concursos.forEach(c => {
        if (c.banca_id) {
          if (!concursosPorBanca[c.banca_id]) {
            concursosPorBanca[c.banca_id] = [];
          }
          concursosPorBanca[c.banca_id].push(c);
        }
      });
      
      // Montar resultado
      const resultado = bancas.map(b => ({
        id: b.id,
        name: b.name,
        total_concursos: concursosPorBanca[b.id]?.length || 0,
        concursos: concursosPorBanca[b.id] || []
      }));
      
      return {
        total_bancas: bancas.length,
        total_concursos: concursos.length,
        concursos_sem_banca: concursos.filter(c => !c.banca_id).length,
        bancas: resultado
      };
      
    } catch (error: any) {
      console.error('[Debug] Erro:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
}
