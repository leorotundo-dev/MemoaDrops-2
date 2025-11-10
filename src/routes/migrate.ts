import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrateRoutes(app: FastifyInstance) {
  app.post('/migrate', async (req, reply) => {
    try {
      const sqlPath = path.join(__dirname, '../db/migrations/001_initial_schema.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      
      await pool.query(sql);
      
      return { success: true, message: 'Migrations executed successfully!' };
    } catch (error: any) {
      return reply.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
}
