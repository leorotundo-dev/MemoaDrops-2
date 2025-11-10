import { pool } from '../db/connection.js';
import { embedText } from './embeddingsService.js';

export async function searchInDeck(deckId: string, query: string, limit=20) {
  const emb = await embedText(query);
  const { rows } = await pool.query(
    `SELECT id, front, back, 1 - (embedding <=> $2) AS score
     FROM cards
     WHERE deck_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2 ASC
     LIMIT $3`,
    [deckId, emb, limit]
  );
  return rows;
}
