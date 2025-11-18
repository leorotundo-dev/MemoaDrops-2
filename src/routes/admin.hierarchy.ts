// src/routes/admin.hierarchy.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';

interface HierarchyParams {
  id: string;
}

interface UpdateNodeBody {
  nome: string;
}

export default async function (fastify: FastifyInstance) {
  /**
   * GET /admin/concursos/:id/hierarchy
   * Retorna hierarquia completa de um concurso para curadoria
   */
  fastify.get<{
    Params: HierarchyParams;
  }>('/admin/concursos/:id/hierarchy', async (request, reply) => {
    try {
      const concursoId = request.params.id;

      // Buscar informações do concurso
      const concursoRes = await pool.query<{
        id: string;
        name: string;
      }>('SELECT id, name FROM concursos WHERE id = $1', [concursoId]);

      if (concursoRes.rowCount === 0) {
        return reply.status(404).send({ erro: 'Concurso não encontrado' });
      }

      const concurso = concursoRes.rows[0];

      // Buscar hierarquia completa
      const hierarchyRes = await pool.query<{
        materia_id: string;
        materia_nome: string;
        topico_id: string | null;
        topico_nome: string | null;
        subtopico_id: string | null;
        subtopico_nome: string | null;
        has_drop: boolean | null;
      }>(
        `
        SELECT 
          m.id AS materia_id,
          m.nome AS materia_nome,
          t.id AS topico_id,
          t.nome AS topico_nome,
          s.id AS subtopico_id,
          s.nome AS subtopico_nome,
          (SELECT COUNT(*) > 0 FROM drops WHERE subtopico_id = s.id) AS has_drop
        FROM materias m
        JOIN concursos_materias cm ON cm.materia_id = m.id
        LEFT JOIN topicos t ON t.materia_id = m.id
        LEFT JOIN subtopicos s ON s.topico_id = t.id
        WHERE cm.concurso_id = $1
        ORDER BY m.nome, t.nome NULLS LAST, s.nome NULLS LAST
      `,
        [concursoId]
      );

      // Organizar em hierarquia
      const materiasMap = new Map();

      for (const row of hierarchyRes.rows) {
        // Criar matéria se não existir
        if (!materiasMap.has(row.materia_id)) {
          materiasMap.set(row.materia_id, {
            id: row.materia_id,
            nome: row.materia_nome,
            topicos: [],
          });
        }

        const materia = materiasMap.get(row.materia_id);

        // Adicionar tópico se existir
        if (row.topico_id) {
          let topico = materia.topicos.find(
            (t: any) => t.id === row.topico_id
          );
          if (!topico) {
            topico = {
              id: row.topico_id,
              nome: row.topico_nome,
              subtopicos: [],
            };
            materia.topicos.push(topico);
          }

          // Adicionar subtópico se existir
          if (row.subtopico_id) {
            const subtopico = {
              id: row.subtopico_id,
              nome: row.subtopico_nome,
              hasDrop: row.has_drop || false,
            };
            if (
              !topico.subtopicos.find((s: any) => s.id === subtopico.id)
            ) {
              topico.subtopicos.push(subtopico);
            }
          }
        }
      }

      const materias = Array.from(materiasMap.values());

      return reply.send({
        concurso: {
          id: concurso.id,
          name: concurso.name,
        },
        materias,
      });
    } catch (e: any) {
      console.error('Erro em /admin/concursos/:id/hierarchy', e);
      return reply.status(500).send({
        erro: 'Erro interno ao carregar hierarquia',
        detalhe: e?.message,
      });
    }
  });

  /**
   * PATCH /admin/materias/:id
   * Atualiza nome de uma matéria
   */
  fastify.patch<{
    Params: HierarchyParams;
    Body: UpdateNodeBody;
  }>('/admin/materias/:id', async (request, reply) => {
    try {
      const materiaId = request.params.id;
      const { nome } = request.body;

      if (!nome || !nome.trim()) {
        return reply.status(400).send({ erro: 'Nome é obrigatório' });
      }

      const result = await pool.query(
        'UPDATE materias SET nome = $1 WHERE id = $2 RETURNING *',
        [nome.trim(), materiaId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ erro: 'Matéria não encontrada' });
      }

      return reply.send(result.rows[0]);
    } catch (e: any) {
      console.error('Erro em PATCH /admin/materias/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao atualizar matéria',
        detalhe: e?.message,
      });
    }
  });

  /**
   * PATCH /admin/topicos/:id
   * Atualiza nome de um tópico
   */
  fastify.patch<{
    Params: HierarchyParams;
    Body: UpdateNodeBody;
  }>('/admin/topicos/:id', async (request, reply) => {
    try {
      const topicoId = request.params.id;
      const { nome } = request.body;

      if (!nome || !nome.trim()) {
        return reply.status(400).send({ erro: 'Nome é obrigatório' });
      }

      const result = await pool.query(
        'UPDATE topicos SET nome = $1 WHERE id = $2 RETURNING *',
        [nome.trim(), topicoId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ erro: 'Tópico não encontrado' });
      }

      return reply.send(result.rows[0]);
    } catch (e: any) {
      console.error('Erro em PATCH /admin/topicos/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao atualizar tópico',
        detalhe: e?.message,
      });
    }
  });

  /**
   * PATCH /admin/subtopicos/:id
   * Atualiza nome de um subtópico
   */
  fastify.patch<{
    Params: HierarchyParams;
    Body: UpdateNodeBody;
  }>('/admin/subtopicos/:id', async (request, reply) => {
    try {
      const subtopicoId = request.params.id;
      const { nome } = request.body;

      if (!nome || !nome.trim()) {
        return reply.status(400).send({ erro: 'Nome é obrigatório' });
      }

      const result = await pool.query(
        'UPDATE subtopicos SET nome = $1 WHERE id = $2 RETURNING *',
        [nome.trim(), subtopicoId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ erro: 'Subtópico não encontrado' });
      }

      return reply.send(result.rows[0]);
    } catch (e: any) {
      console.error('Erro em PATCH /admin/subtopicos/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao atualizar subtópico',
        detalhe: e?.message,
      });
    }
  });

  /**
   * DELETE /admin/subtopicos/:id
   * Deleta um subtópico e todos os drops associados
   */
  fastify.delete<{
    Params: HierarchyParams;
  }>('/admin/subtopicos/:id', async (request, reply) => {
    const client = await pool.connect();
    try {
      const subtopicoId = request.params.id;

      await client.query('BEGIN');

      // Deletar drops associados
      await client.query('DELETE FROM drops WHERE subtopico_id = $1', [
        subtopicoId,
      ]);

      // Deletar subtópico
      const result = await client.query(
        'DELETE FROM subtopicos WHERE id = $1 RETURNING *',
        [subtopicoId]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ erro: 'Subtópico não encontrado' });
      }

      await client.query('COMMIT');

      return reply.send({ sucesso: true });
    } catch (e: any) {
      await client.query('ROLLBACK');
      console.error('Erro em DELETE /admin/subtopicos/:id', e);
      return reply.status(500).send({
        erro: 'Erro interno ao deletar subtópico',
        detalhe: e?.message,
      });
    } finally {
      client.release();
    }
  });
}
