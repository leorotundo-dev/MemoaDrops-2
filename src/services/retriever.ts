import { pool } from '../db/connection.js';

/**
 * RAG integrado com o banco de dados do MemoDrops.
 * Busca questões, alternativas e conteúdos relacionados.
 */
export type RetrievedSnippet = {
  source_type: string; // 'edital' | 'lei' | 'aula' | 'deck' | 'questao'
  source_id: string;
  title?: string;
  snippet: string;
  score: number;
};

export async function retrieveSnippets(opts: {
  subject_id?: string | null;
  exam_id?: string | null;
  query?: string;
  k?: number;
  maxChars?: number;
}): Promise<RetrievedSnippet[]> {
  const K = opts.k ?? 3;
  const MAX = opts.maxChars ?? 800;
  const snippets: RetrievedSnippet[] = [];

  try {
    // 1) Buscar questões relacionadas ao concurso
    if (opts.exam_id) {
      const { rows } = await pool.query(
        `SELECT q.id, q.enunciado, c.name as concurso_name
         FROM questoes q
         JOIN concursos c ON c.id = q.concurso_id
         WHERE q.concurso_id = $1
         ORDER BY q.created_at DESC
         LIMIT $2`,
        [opts.exam_id, K]
      );
      for (const row of rows) {
        snippets.push({
          source_type: 'questao',
          source_id: row.id,
          title: `Questão - ${row.concurso_name}`,
          snippet: row.enunciado.slice(0, MAX),
          score: 0.9
        });
      }
    }

    // 2) Buscar por texto se não encontrou nada
    if (snippets.length === 0 && opts.query && opts.query.length > 3) {
      const { rows } = await pool.query(
        `SELECT q.id, q.enunciado, c.name as concurso_name
         FROM questoes q
         JOIN concursos c ON c.id = q.concurso_id
         WHERE q.enunciado ILIKE $1
         ORDER BY q.created_at DESC
         LIMIT $2`,
        [`%${opts.query}%`, K]
      );
      for (const row of rows) {
        snippets.push({
          source_type: 'questao',
          source_id: row.id,
          title: `Questão - ${row.concurso_name}`,
          snippet: row.enunciado.slice(0, MAX),
          score: 0.7
        });
      }
    }

    // 3) Fallback: questões aleatórias
    if (snippets.length === 0) {
      const { rows } = await pool.query(
        `SELECT q.id, q.enunciado, c.name as concurso_name
         FROM questoes q
         JOIN concursos c ON c.id = q.concurso_id
         ORDER BY RANDOM()
         LIMIT $1`,
        [K]
      );
      for (const row of rows) {
        snippets.push({
          source_type: 'questao',
          source_id: row.id,
          title: `Questão - ${row.concurso_name}`,
          snippet: row.enunciado.slice(0, MAX),
          score: 0.5
        });
      }
    }
  } catch (error) {
    console.error('[Retriever] Erro:', error);
    return [];
  }

  return snippets.slice(0, K);
}
