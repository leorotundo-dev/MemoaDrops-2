import { pool } from '../db/connection.js';
import { getEmbedding } from '../services/embeddings.js';

export async function vectorProcessor(data: { conteudoId: number }) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, texto FROM conteudos WHERE id=$1', [data.conteudoId]);
    const row = rows?.[0];
    if (!row) return { ok: false, reason: 'conteudo_not_found' };

    const emb = await getEmbedding(row.texto);
    // pg driver maps JS arrays -> 'vector' via pgvector extension
    await client.query('UPDATE conteudos SET embedding = $1 WHERE id = $2', [emb, row.id]);

    await client.query('INSERT INTO jobs (type, status, data, result) VALUES ($1,$2,$3,$4)',
      ['vector', 'completed', { conteudoId: row.id }, { dims: emb.length }] as any);

    return { ok: true, id: row.id, dims: emb.length };
  } finally {
    client.release();
  }
}
