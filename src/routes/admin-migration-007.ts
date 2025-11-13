import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function adminMigration007Routes(fastify: FastifyInstance) {
  fastify.post('/admin/migration-007', async (request, reply) => {
    const client = await pool.connect();
    
    try {
      console.log('[Migration 007 API] Executando migration...');
      
      const migrationSQL = `
        -- Migration 007: Create topicos, subtopicos, subsubtopicos tables
        
        CREATE TABLE IF NOT EXISTS topicos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
          nome VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          descricao TEXT,
          ordem INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT topicos_unique_slug UNIQUE (materia_id, slug),
          CONSTRAINT topicos_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
        );

        CREATE INDEX IF NOT EXISTS idx_topicos_materia_id ON topicos(materia_id);
        CREATE INDEX IF NOT EXISTS idx_topicos_slug ON topicos(slug);
        CREATE INDEX IF NOT EXISTS idx_topicos_ordem ON topicos(ordem);

        CREATE TABLE IF NOT EXISTS subtopicos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          topico_id UUID NOT NULL REFERENCES topicos(id) ON DELETE CASCADE,
          nome VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          descricao TEXT,
          ordem INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT subtopicos_unique_slug UNIQUE (topico_id, slug),
          CONSTRAINT subtopicos_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
        );

        CREATE INDEX IF NOT EXISTS idx_subtopicos_topico_id ON subtopicos(topico_id);
        CREATE INDEX IF NOT EXISTS idx_subtopicos_slug ON subtopicos(slug);
        CREATE INDEX IF NOT EXISTS idx_subtopicos_ordem ON subtopicos(ordem);

        CREATE TABLE IF NOT EXISTS subsubtopicos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subtopico_id UUID NOT NULL REFERENCES subtopicos(id) ON DELETE CASCADE,
          nome VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          descricao TEXT,
          ordem INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT subsubtopicos_unique_slug UNIQUE (subtopico_id, slug),
          CONSTRAINT subsubtopicos_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
        );

        CREATE INDEX IF NOT EXISTS idx_subsubtopicos_subtopico_id ON subsubtopicos(subtopico_id);
        CREATE INDEX IF NOT EXISTS idx_subsubtopicos_slug ON subsubtopicos(slug);
        CREATE INDEX IF NOT EXISTS idx_subsubtopicos_ordem ON subsubtopicos(ordem);

        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_topicos_updated_at ON topicos;
        CREATE TRIGGER update_topicos_updated_at
          BEFORE UPDATE ON topicos
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_subtopicos_updated_at ON subtopicos;
        CREATE TRIGGER update_subtopicos_updated_at
          BEFORE UPDATE ON subtopicos
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_subsubtopicos_updated_at ON subsubtopicos;
        CREATE TRIGGER update_subsubtopicos_updated_at
          BEFORE UPDATE ON subsubtopicos
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `;
      
      await client.query(migrationSQL);
      
      console.log('[Migration 007 API] ✅ Migration executada com sucesso!');
      
      return {
        success: true,
        message: 'Migration 007 executada com sucesso - tabelas topicos, subtopicos e subsubtopicos criadas'
      };
      
    } catch (error: any) {
      console.error('[Migration 007 API] ❌ Erro:', error.message);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    } finally {
      client.release();
    }
  });
}
