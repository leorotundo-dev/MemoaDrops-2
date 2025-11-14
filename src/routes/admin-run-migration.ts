import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (fastify: FastifyInstance) {
  // Endpoint temporário para executar migration 048
  fastify.post('/admin/run-migration-048', async (request, reply) => {
    try {
      console.log('🚀 Iniciando execução da migration 048...');
      
      // Ler arquivo SQL da migration
      const migrationPath = path.join(__dirname, '../db/migrations/048_add_contest_details.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      console.log('📄 Migration SQL carregado:', migrationSQL.substring(0, 200) + '...');
      
      // Executar SQL
      await db.raw(migrationSQL);
      
      console.log('✅ Migration 048 executada com sucesso!');
      
      // Verificar se as colunas foram criadas
      const checkColumns = await db.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'concursos' 
        AND column_name IN ('ano', 'nivel', 'orgao', 'estado', 'cidade', 'numero_vagas', 'salario', 'salario_max')
        ORDER BY column_name
      `);
      
      return {
        success: true,
        message: 'Migration 048 executada com sucesso!',
        columns_created: checkColumns.rows,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao executar migration 048:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
}
