import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import pool from '../db/connection.js';

export default async function fixBancasRoutes(app: FastifyInstance) {
  // Endpoint temporário para adicionar coluna display_name
  app.post('/admin/fix-bancas-schema', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    try {
      // Adicionar coluna display_name se não existir
      await pool.query(`
        ALTER TABLE bancas 
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
      `);
      
      // Copiar valores de name para display_name onde estiver NULL
      await pool.query(`
        UPDATE bancas 
        SET display_name = name 
        WHERE display_name IS NULL;
      `);
      
      // Tornar NOT NULL (se possível)
      try {
        await pool.query(`
          ALTER TABLE bancas 
          ALTER COLUMN display_name SET NOT NULL;
        `);
      } catch (e) {
        // Ignorar se já for NOT NULL
      }
      
      return { success: true, message: 'Schema atualizado com sucesso!' };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
