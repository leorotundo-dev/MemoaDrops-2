import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS concursos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  dou_url TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS materias (
  id SERIAL PRIMARY KEY,
  contest_id INT NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conteudos (
  id SERIAL PRIMARY KEY,
  materia_id INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  embedding VECTOR(1536)
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  data JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
`;

export async function migrateRoutes(app: FastifyInstance) {
  app.post('/migrate', async (req, reply) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(MIGRATION_SQL);
      await client.query('COMMIT');
      
      return { success: true, message: 'Migrations executed successfully!' };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Migration error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
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
