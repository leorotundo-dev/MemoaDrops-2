// src/routes/admin.gerar-drops-lote.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/index.js';
import { calcularIncidenciaPorBanca } from '../services/incidencia-analyzer.js';
import { randomUUID } from 'crypto';

interface GerarDropsLoteParams {
  id: string;
}

interface GerarDropsLoteBody {
  limite?: number;
  priorizar_por_incidencia?: boolean;
}

export default async function (fastify: FastifyInstance) {
  /**
   * POST /admin/concursos/:id/gerar-drops-lote
   * Body: { limite?: number, priorizar_por_incidencia?: boolean }
   */
  fastify.post<{
    Params: GerarDropsLoteParams;
    Body: GerarDropsLoteBody;
  }>('/admin/concursos/:id/gerar-drops-lote', async (request, reply) => {
    const client = await pool.connect();
    try {
      const concursoId = request.params.id;
      const limite: number = request.body?.limite ?? 50;
      const priorizar: boolean = !!request.body?.priorizar_por_incidencia;

      await client.query('BEGIN');

      // Descobre a banca do concurso
      const concursoRes = await client.query<{
        banca_id: number;
      }>('SELECT banca_id FROM concursos WHERE id = $1', [concursoId]);

      if (concursoRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ erro: 'Concurso não encontrado' });
      }

      const bancaId = concursoRes.rows[0].banca_id;

      // Busca subtópicos vinculados à hierarquia do concurso
      const subtRes = await client.query<{
        subtopico_id: string;
        subtopico_nome: string;
      }>(
        `
        SELECT DISTINCT s.id AS subtopico_id, s.nome AS subtopico_nome
        FROM subtopicos s
        JOIN topicos t ON t.id = s.topico_id
        JOIN materias m ON m.id = t.materia_id
        JOIN concursos_materias cm ON cm.materia_id = m.id
        WHERE cm.concurso_id = $1
      `,
        [concursoId]
      );

      let subtops = subtRes.rows;

      if (subtops.length === 0) {
        await client.query('ROLLBACK');
        return reply.status(400).send({
          erro: 'Nenhum subtópico associado à hierarquia deste concurso.',
        });
      }

      if (priorizar) {
        // Calcula incidência por banca e reordena subtópicos de acordo
        const incidencia = await calcularIncidenciaPorBanca(bancaId, {
          limite: subtops.length,
        });

        const prioridade = new Map<string, number>();
        incidencia.forEach((item, index) => {
          prioridade.set(item.subtopico_id, index);
        });

        subtops = subtops.slice().sort((a, b) => {
          const pa = prioridade.has(a.subtopico_id)
            ? prioridade.get(a.subtopico_id)!
            : Number.MAX_SAFE_INTEGER;
          const pb = prioridade.has(b.subtopico_id)
            ? prioridade.get(b.subtopico_id)!
            : Number.MAX_SAFE_INTEGER;
          return pa - pb;
        });
      }

      const selectedSubtops = subtops.slice(0, limite);

      // Geração simplificada de Drops (exemplo: apenas registra stub no banco)
      for (const sub of selectedSubtops) {
        const dropId = randomUUID();
        await client.query(
          `
          INSERT INTO drops (
            id,
            concurso_id,
            subtopico_id,
            titulo,
            conteudo,
            dificuldade,
            tempo_estimado_minutos,
            aprovado,
            gerado_em
          ) VALUES (
            $1, $2, $3,
            $4,
            $5,
            $6,
            $7,
            false,
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `,
          [
            dropId,
            concursoId,
            sub.subtopico_id,
            `Drop - ${sub.subtopico_nome}`,
            '', // conteúdo será preenchido pela camada de IA existente
            'medio',
            15,
          ]
        );
      }

      await client.query('COMMIT');

      return reply.send({
        sucesso: true,
        concurso_id: concursoId,
        banca_id: bancaId,
        subtopicos_processados: selectedSubtops.length,
        priorizar_por_incidencia: priorizar,
      });
    } catch (e: any) {
      await client.query('ROLLBACK');
      console.error('Erro em gerar-drops-lote:', e);
      return reply.status(500).send({
        erro: 'Erro interno ao gerar drops em lote',
        detalhe: e?.message,
      });
    } finally {
      client.release();
    }
  });
}
