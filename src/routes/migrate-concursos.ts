import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../db/connection.js';

export default async function (app: FastifyInstance) {
  /**
   * POST /admin/migrate-concursos
   * Executa migração 030 para adicionar relação entre concursos e bancas
   */
  app.post('/admin/migrate-concursos', async (request, reply) => {
    try {
      console.log('[Migrate Concursos] Iniciando migração 030...');
      
      const migrationPath = join(process.cwd(), 'src', 'db', 'migrations', '030_add_banca_id_to_concursos.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      await pool.query(migrationSQL);
      
      console.log('[Migrate Concursos] Migração 030 executada com sucesso!');
      
      return reply.send({ 
        success: true, 
        message: 'Migração 030 executada com sucesso!' 
      });
      
    } catch (error) {
      console.error('[Migrate Concursos] Erro ao executar migração:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Erro ao executar migração',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
