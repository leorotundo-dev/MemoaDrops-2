import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function adminMigration006Routes(fastify: FastifyInstance) {
  fastify.post('/admin/migration-006', async (request, reply) => {
    const client = await pool.connect();
    
    try {
      console.log('[Migration 006 API] Executando migration...');
      
      const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '006_fix_materias_table.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
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
