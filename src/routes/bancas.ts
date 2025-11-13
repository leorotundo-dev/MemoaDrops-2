import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export async function registerBancaRoutes(app: FastifyInstance) {
  // Listar todas as bancas (público)
  app.get('/bancas', async (request, reply) => {
    try {
      const { search, area, status, sort, limit = 50, offset = 0 } = request.query as any;
      let query = `SELECT b.* FROM bancas b WHERE b.is_active = true`;
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (b.name ILIKE $${paramCount} OR b.display_name ILIKE $${paramCount} OR b.full_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }
      if (area && area !== 'all') {
        paramCount++;
        query += ` AND b.areas::jsonb @> $${paramCount}::jsonb`;
        params.push(JSON.stringify([area]));
      }

      if (sort === 'name') query += ` ORDER BY b.name ASC`;
      else if (sort === 'contests') query += ` ORDER BY b.total_contests DESC`;
      else query += ` ORDER BY b.created_at DESC`;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const { rows } = await pool.query(query, params);
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Detalhes de uma banca (público)
  app.get('/bancas/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rows: [banca] } = await pool.query(`
        SELECT b.*
        FROM bancas b
        WHERE b.id=$1 AND b.is_active = true`, [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      return banca;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Listar concursos de uma banca (público)
  app.get('/bancas/:id/contests', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { limit = 50, offset = 0, status = 'all' } = request.query as any;
      
      // Verificar se a banca existe e está ativa
      const { rows: [banca] } = await pool.query('SELECT id FROM bancas WHERE id=$1 AND is_active = true', [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      
      // Buscar concursos da banca
      let query = `
        SELECT id, name, slug, banca, ano, nivel, data_prova, salario, numero_vagas, created_at
        FROM concursos
        WHERE banca_id = $1
      `;
      
      // Adicionar filtro de status se necessário
      if (status === 'active') {
        query += ` AND status = 'active'`;
      } else if (status === 'archived') {
        query += ` AND status = 'archived'`;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      
      const { rows } = await pool.query(query, [id, limit, offset]);
      
      // Buscar total de concursos
      const { rows: [{ total }] } = await pool.query(`
        SELECT COUNT(*)::int AS total
        FROM concursos
        WHERE banca_id = $1
      `, [id]);
      
      return {
        contests: rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Estatísticas de uma banca (público)
  app.get('/bancas/:id/stats', async (request, reply) => {
    try {
      const { id } = request.params as any;
      
      // Verificar se a banca existe e está ativa
      const { rows: [banca] } = await pool.query('SELECT id, display_name, total_contests FROM bancas WHERE id=$1 AND is_active = true', [id]);
      if (!banca) return reply.status(404).send({ error: 'Banca not found' });
      
      // Buscar estatísticas por ano
      const { rows: yearStats } = await pool.query(`
        SELECT 
          EXTRACT(YEAR FROM created_at)::int AS year,
          COUNT(*)::int AS total_contests
        FROM concursos
        WHERE banca_id = $1
        GROUP BY EXTRACT(YEAR FROM created_at)
        ORDER BY year DESC
        LIMIT 10
      `, [id]);
      
      return {
        banca: {
          id: banca.id,
          display_name: banca.display_name,
          total_contests: banca.total_contests
        },
        by_year: yearStats
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
