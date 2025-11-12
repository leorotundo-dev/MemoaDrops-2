import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

const MIGRATION_SQL = `
-- Migration: Add logo_data column to bancas table
-- Description: Store logo images as binary data in the database

ALTER TABLE bancas ADD COLUMN IF NOT EXISTS logo_data BYTEA;
ALTER TABLE bancas ADD COLUMN IF NOT EXISTS logo_mime_type VARCHAR(50);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bancas_logo_data ON bancas(id) WHERE logo_data IS NOT NULL;

-- Add comment
COMMENT ON COLUMN bancas.logo_data IS 'Binary data of the logo image';
COMMENT ON COLUMN bancas.logo_mime_type IS 'MIME type of the logo image (e.g., image/png, image/jpeg)';
`;

export async function migrateLogosRoutes(app: FastifyInstance) {
  app.post('/admin/migrate-logos', async (req, reply) => {
    const client = await pool.connect();
    try {
      console.log('🔄 Executando migração 029: adicionar colunas de logo ao bancas...');
      
      await client.query('BEGIN');
      await client.query(MIGRATION_SQL);
      await client.query('COMMIT');
      
      console.log('✅ Migração 029 executada com sucesso!');
      
      // Verificar se as colunas foram criadas
      const { rows } = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bancas' 
        AND column_name IN ('logo_data', 'logo_mime_type')
        ORDER BY column_name
      `);
      
      return { 
        success: true, 
        message: 'Migration 029 executed successfully!',
        columns: rows
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Erro na migração:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error?.message || String(error),
        details: error?.stack || 'No stack trace available'
      });
    } finally {
      client.release();
    }
  });
}
