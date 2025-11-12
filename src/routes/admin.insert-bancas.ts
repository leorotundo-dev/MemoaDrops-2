import type { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function (app: FastifyInstance) {
  /**
   * POST /admin/insert-bancas
   * Insere múltiplas bancas no banco de dados
   */
  app.post('/admin/insert-bancas', async (request, reply) => {
    try {
      const bancas = request.body as Array<{
        name: string;
        display_name: string;
        website_url?: string;
        is_active?: boolean;
        priority?: number;
        tier?: number;
        notes?: string;
      }>;

      if (!Array.isArray(bancas) || bancas.length === 0) {
        return reply.code(400).send({ error: 'Body deve ser um array de bancas' });
      }

      console.log(`[Insert Bancas] Recebidas ${bancas.length} bancas para inserir`);

      let inserted = 0;
      let skipped = 0;
      let errors = 0;
      const results: any[] = [];

      for (const banca of bancas) {
        try {
          if (!banca.name || !banca.display_name) {
            results.push({
              banca: banca.display_name || banca.name || 'unknown',
              status: 'error',
              message: 'name e display_name são obrigatórios'
            });
            errors++;
            continue;
          }

          // Verificar se já existe
          const { rows: existing } = await pool.query(
            'SELECT id, name FROM bancas WHERE name = $1',
            [banca.name]
          );

          if (existing.length > 0) {
            results.push({
              banca: banca.display_name,
              status: 'skipped',
              message: `Já existe (ID: ${existing[0].id})`
            });
            skipped++;
            continue;
          }

          // Inserir
          const { rows: [newBanca] } = await pool.query(`
            INSERT INTO bancas (
              name,
              display_name,
              website_url,
              description,
              is_active,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id, name, display_name
          `, [
            banca.name,
            banca.display_name,
            banca.website_url || null,
            banca.notes || null,
            banca.is_active !== undefined ? banca.is_active : true
          ]);

          results.push({
            banca: newBanca.display_name,
            status: 'inserted',
            id: newBanca.id,
            message: 'Inserida com sucesso'
          });
          inserted++;

        } catch (error: any) {
          results.push({
            banca: banca.display_name || banca.name,
            status: 'error',
            message: error.message
          });
          errors++;
        }
      }

      return reply.send({
        success: true,
        summary: {
          total: bancas.length,
          inserted,
          skipped,
          errors
        },
        results
      });

    } catch (error: any) {
      console.error('[Insert Bancas] Erro:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao inserir bancas',
        details: error.message
      });
    }
  });
}
