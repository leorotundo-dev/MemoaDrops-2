import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function registerAdminDeleteDuplicatesRoutes(app: FastifyInstance) {
  app.delete('/admin/delete-duplicate-bancas', async (request, reply) => {
    try {
      console.log('[Admin] Deletando bancas duplicadas...');

      // IDs das bancas duplicadas para deletar
      const duplicateIds = [
        14, // INSTITUTO AOCP (manter AOCP ID 11)
        19, // instituto_aocp (manter AOCP ID 11)
        16, // cespe_cebraspe (manter CEBRASPE ID 1)
        17, // fundacao_carlos_chagas (manter FCC ID 2)
        18, // fundacao_getulio_vargas (manter FGV ID 3)
        37, // objetiva minúscula (manter OBJETIVA ID 15)
      ];

      const results = [];

      for (const id of duplicateIds) {
        try {
          // Buscar info da banca antes de deletar
          const { rows: [banca] } = await pool.query(`
            SELECT id, name FROM bancas WHERE id = $1
          `, [id]);

          if (banca) {
            // Deletar
            await pool.query(`DELETE FROM bancas WHERE id = $1`, [id]);
            results.push({
              id,
              name: banca.name,
              status: 'deleted'
            });
            console.log(`✅ Deletado: ID ${id} - ${banca.name}`);
          } else {
            results.push({
              id,
              status: 'not_found'
            });
            console.log(`⚠️  Não encontrado: ID ${id}`);
          }
        } catch (error: any) {
          results.push({
            id,
            status: 'error',
            error: error.message
          });
          console.error(`❌ Erro ao deletar ID ${id}:`, error.message);
        }
      }

      // Contar bancas restantes
      const { rows: [count] } = await pool.query(`
        SELECT COUNT(*) as total FROM bancas
      `);

      return {
        success: true,
        deleted: results.filter(r => r.status === 'deleted').length,
        not_found: results.filter(r => r.status === 'not_found').length,
        errors: results.filter(r => r.status === 'error').length,
        remaining_bancas: parseInt(count.total),
        results
      };

    } catch (error: any) {
      console.error('[Admin] Erro ao deletar duplicatas:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
