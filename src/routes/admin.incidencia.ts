// src/routes/admin.incidencia.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';
import { calcularIncidenciaPorBanca } from '../services/incidencia-analyzer.js';

interface IncidenciaParams {
  id: string;
}

interface IncidenciaQuery {
  limite?: string;
  anosRecentes?: string;
}

export default async function (fastify: FastifyInstance) {
  /**
   * GET /admin/bancas/:id/incidencia
   * Query: limite, anosRecentes
   */
  fastify.get<{
    Params: IncidenciaParams;
    Querystring: IncidenciaQuery;
  }>('/admin/bancas/:id/incidencia', async (request, reply) => {
    try {
      const bancaIdRaw = request.params.id;
      const bancaId = Number(bancaIdRaw);

      if (!Number.isFinite(bancaId)) {
        return reply.status(400).send({ erro: 'banca_id inválido' });
      }

      const limite = request.query.limite
        ? Number(request.query.limite)
        : undefined;
      const anosRecentes = request.query.anosRecentes
        ? Number(request.query.anosRecentes)
        : undefined;

      const bancaRes = await pool.query<{ id: number; nome: string }>(
        'SELECT id, nome FROM bancas WHERE id = $1',
        [bancaId]
      );

      const bancaRow = bancaRes.rows[0];
      const banca_nome = bancaRow?.nome ?? `Banca ${bancaId}`;

      // Obter total de questões analisadas com o mesmo filtro de anos
      const params: any[] = [bancaId];
      let where = 'banca_id = $1';
      if (anosRecentes && anosRecentes > 0) {
        params.push(anosRecentes);
        where +=
          " AND concurso_id IN (SELECT id FROM concursos WHERE data_prova >= (CURRENT_DATE - ($2 || ' years')::interval))";
      }

      const totalRes = await pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM questoes WHERE ${where}`,
        params
      );
      const total_questoes_analisadas = Number(totalRes.rows[0]?.total ?? 0);

      const incidencia = await calcularIncidenciaPorBanca(bancaId, {
        limite,
        anosRecentes,
      });

      return reply.send({
        banca_id: bancaId,
        banca_nome,
        total_questoes_analisadas,
        incidencia,
      });
    } catch (e: any) {
      console.error('Erro em /admin/bancas/:id/incidencia', e);
      return reply.status(500).send({
        erro: 'Erro interno ao calcular incidência',
        detalhe: e?.message,
      });
    }
  });
}
