import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function adminMigration006Routes(fastify: FastifyInstance) {
  fastify.post('/admin/migration-006', async (request, reply) => {
    const client = await pool.connect();
    
    try {
      console.log('[Migration 006 API] Executando migration...');
      
      const migrationSQL = `
        -- Migration 006: Fix materias table structure
        DROP TABLE IF EXISTS materias CASCADE;
        
        CREATE TABLE IF NOT EXISTS materias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contest_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
          nome VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(contest_id, slug)
        );
        
        CREATE INDEX IF NOT EXISTS idx_materias_contest_id ON materias(contest_id);
        CREATE INDEX IF NOT EXISTS idx_materias_slug ON materias(slug);
      `;
      
      await client.query(migrationSQL);
      
      console.log('[Migration 006 API] ✅ Migration executada com sucesso!');
      
      return {
        success: true,
        message: 'Migration 006 executada com sucesso - tabela materias corrigida'
      };
      
    } catch (error: any) {
      console.error('[Migration 006 API] ❌ Erro:', error.message);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    } finally {
      client.release();
    }
  });
}
