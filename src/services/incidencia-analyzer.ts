// src/services/incidencia-analyzer.ts
import { pool } from '../db/index.js';

export interface IncidenciaResult {
  subtopico_id: string;
  subtopico_nome: string;
  materia_nome: string;
  topico_nome: string;
  frequencia: number;
  percentual: number;
}

export async function calcularIncidenciaPorBanca(
  bancaId: number,
  opcoes?: {
    limite?: number;
    anosRecentes?: number;
  }
): Promise<IncidenciaResult[]> {
  const limite = opcoes?.limite ?? 20;
  const anosRecentes = opcoes?.anosRecentes;

  const client = await pool.connect();
  try {
    const params: any[] = [bancaId];
    let where = "q.banca_id = $1";

    if (anosRecentes && anosRecentes > 0) {
      // Filtra pela data do concurso: últimos X anos
      params.push(anosRecentes);
      where +=
        " AND c.data_prova >= (CURRENT_DATE - ($2 || ' years')::interval)";
    }

    // Total de questões da banca (após filtro por anos)
    const totalRes = await client.query<{
      total: string;
    }>(
      `
      SELECT COUNT(DISTINCT q.id) AS total
      FROM questoes q
      JOIN concursos c ON c.id = q.concurso_id
      WHERE ${where}
    `,
      params
    );

    const totalQuestoes = Number(totalRes.rows[0]?.total ?? 0);
    if (totalQuestoes === 0) {
      return [];
    }

    // Agrupa por subtopico_id
    const incidenciaRes = await client.query<{
      subtopico_id: string | null;
      subtopico_nome: string | null;
      materia_nome: string | null;
      topico_nome: string | null;
      frequencia: string;
    }>(
      `
      SELECT
        qm.subtopico_id,
        COALESCE(s.nome, 'Subtópico sem nome')   AS subtopico_nome,
        COALESCE(m.nome, 'Matéria não definida') AS materia_nome,
        COALESCE(t.nome, 'Tópico não definido')  AS topico_nome,
        COUNT(*) AS frequencia
      FROM questoes q
      JOIN concursos c ON c.id = q.concurso_id
      JOIN questoes_materias qm ON qm.questao_id = q.id
      LEFT JOIN subtopicos s ON s.id = qm.subtopico_id
      LEFT JOIN topicos t ON t.id = qm.topico_id
      LEFT JOIN materias m ON m.id = qm.materia_id
      WHERE ${where}
        AND qm.subtopico_id IS NOT NULL
      GROUP BY qm.subtopico_id, s.nome, m.nome, t.nome
      ORDER BY COUNT(*) DESC
      LIMIT $${params.length + 1}
    `,
      [...params, limite]
    );

    const resultados: IncidenciaResult[] = incidenciaRes.rows.map((row) => {
      const freq = Number(row.frequencia);
      const percentual =
        totalQuestoes > 0 ? (freq / totalQuestoes) * 100 : 0;

      return {
        subtopico_id: row.subtopico_id!,
        subtopico_nome: row.subtopico_nome || "Subtópico",
        materia_nome: row.materia_nome || "Matéria",
        topico_nome: row.topico_nome || "Tópico",
        frequencia: freq,
        percentual: Number(percentual.toFixed(2)),
      };
    });

    return resultados;
  } finally {
    client.release();
  }
}
