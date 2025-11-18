// src/routes/admin.drops.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';

interface DropParams {
  id: string;
}

interface DropsQuery {
  page?: string;
  limit?: string;
  materia?: string;
  dificuldade?: string;
  aprovado?: string;
  q?: string;
}

interface UpdateDropBody {
  titulo?: string;
  conteudo?: string;
  aprovado?: boolean;
}

export default async function (fastify: FastifyInstance) {
  /**
   * GET /admin/drops
   * Lista drops com filtros e paginação
   */
  fastify.get<{
    Querystring: DropsQuery;
  }>('/admin/drops', async (request, reply) => {
    try {
      const page = parseInt(request.query.page || '1', 10);
      const limit = parseInt(request.query.limit || '20', 10);
      const offset = (page - 1) * limit;

      const params: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      // Filtro por matéria
      if (request.query.materia) {
        params.push(`%${request.query.materia}%`);
        conditions.push(`m.nome ILIKE $${paramIndex++}`);
      }

      // Filtro por dificuldade
      if (request.query.dificuldade) {
        params.push(request.query.dificuldade);
        conditions.push(`d.dificuldade = $${paramIndex++}`);
      }

      // Filtro por status de aprovação
      if (request.query.aprovado) {
        const aprovado = request.query.aprovado === 'aprovado';
        params.push(aprovado);
        conditions.push(`d.aprovado = $${paramIndex++}`);
      }

      // Busca por título
      if (request.query.q) {
        params.push(`%${request.query.q}%`);
        conditions.push(`d.titulo ILIKE $${paramIndex++}`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Contar total
      const countRes = await pool.query<{ total: string }>(
        `
        SELECT COUNT(*) AS total
        FROM drops d
        LEFT JOIN subtopicos s ON s.id = d.subtopico_id
        LEFT JOIN topicos t ON t.id = s.topico_id
        LEFT JOIN materias m ON m.id = t.materia_id
        ${whereClause}
      `,
        params
      );

      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      // Buscar drops
      params.push(limit, offset);
      const dropsRes = await pool.query<{
        id: string;
        titulo: string;
        materia_nome: string;
        topico_nome: string;
        subtopico_nome: string;
        dificuldade: string;
        tempo_estimado_minutos: number;
        aprovado: boolean;
        gerado_em: string;
      }>(
        `
        SELECT 
          d.id,
          d.titulo,
          COALESCE(m.nome, 'Sem matéria') AS materia_nome,
          COALESCE(t.nome, 'Sem tópico') AS topico_nome,
          COALESCE(s.nome, 'Sem subtópico') AS subtopico_nome,
          d.dificuldade,
          d.tempo_estimado_minutos,
          d.aprovado,
          d.gerado_em
        FROM drops d
        LEFT JOIN subtopicos s ON s.id = d.subtopico_id
        LEFT JOIN topicos t ON t.id = s.topico_id
        LEFT JOIN materias m ON m.id = t.materia_id
        ${whereClause}
        ORDER BY d.gerado_em DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `,
        params
      );

      return reply.send({
        drops: dropsRes.rows,
        total,
        page,
        limit,
      });
    } catch (e: any) {
      console.error('Erro em GET /admin/drops', e);
      return reply.status(500).send({
        erro: 'Erro interno ao listar drops',
        detalhe: e?.message,
      });
    }
  });

  /**
   * GET /admin/drops/:id
   * Retorna detalhes completos de um drop
   */
  fastify.get<{
    Params: DropParams;
  }>('/admin/drops/:id', async (request, reply) => {
    try {
      const dropId = request.params.id;

      const result = await pool.query<{
        id: string;
        titulo: string;
        conteudo: string;
        exemplo_pratico: string | null;
        tecnicas_memorizacao: string[] | null;
        fontes: any[] | null;
        aprovado: boolean;
        dificuldade: string;
        tempo_estimado_minutos: number;
        gerado_em: string;
      }>(
        `
        SELECT 
          id,
          titulo,
          conteudo,
          exemplo_pratico,
          tecnicas_memorizacao,
          fontes,
          aprovado,
          dificuldade,
          tempo_estimado_minutos,
          gerado_em
        FROM drops
        WHERE id = $1
      `,
        [dropId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ erro: 'Drop não encontrado' });
      }

      return reply.send(result.rows[0]);
    } catch (e: any) {
      console.error('Erro em GET /admin/drops/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao buscar drop',
        detalhe: e?.message,
      });
    }
  });

  /**
   * PATCH /admin/drops/:id
   * Atualiza um drop
   */
  fastify.patch<{
    Params: DropParams;
    Body: UpdateDropBody;
  }>('/admin/drops/:id', async (request, reply) => {
    try {
      const dropId = request.params.id;
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (request.body.titulo !== undefined) {
        params.push(request.body.titulo);
        updates.push(`titulo = $${paramIndex++}`);
      }

      if (request.body.conteudo !== undefined) {
        params.push(request.body.conteudo);
        updates.push(`conteudo = $${paramIndex++}`);
      }

      if (request.body.aprovado !== undefined) {
        params.push(request.body.aprovado);
        updates.push(`aprovado = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.status(400).send({ erro: 'Nenhum campo para atualizar' });
      }

      params.push(dropId);
      const result = await pool.query(
        `UPDATE drops SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ erro: 'Drop não encontrado' });
      }

      return reply.send(result.rows[0]);
    } catch (e: any) {
      console.error('Erro em PATCH /admin/drops/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao atualizar drop',
        detalhe: e?.message,
      });
    }
  });

  /**
   * DELETE /admin/drops/:id
   * Deleta um drop
   */
  fastify.delete<{
    Params: DropParams;
  }>('/admin/drops/:id', async (request, reply) => {
    try {
      const dropId = request.params.id;

      const result = await pool.query(
        'DELETE FROM drops WHERE id = $1 RETURNING *',
        [dropId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ erro: 'Drop não encontrado' });
      }

      return reply.send({ sucesso: true });
    } catch (e: any) {
      console.error('Erro em DELETE /admin/drops/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao deletar drop',
        detalhe: e?.message,
      });
    }
  });
}
