import { pool } from '../db/connection.js';
import { getEmbedding } from './embeddings.js';

/**
 * Busca semântica com pgvector usando distância L2 (<#>).
 * Retorna top 8 conteúdos mais próximos do embedding da query.
 */
export async function semanticSearch(contestId: number, query: string) {
  const emb = await getEmbedding(query);
  const { rows } = await pool.query(
    `SELECT c.id, c.materia_id, c.texto
     FROM conteudos c
     WHERE c.materia_id IN (SELECT id FROM materias WHERE contest_id = $1) AND c.embedding IS NOT NULL
     ORDER BY c.embedding <#> $2
     LIMIT 8`,
    [contestId, emb]
  );
  return rows;
}
