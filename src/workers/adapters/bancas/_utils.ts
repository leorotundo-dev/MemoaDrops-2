import { pool } from '../../utils/db.js';
import { createHash } from 'crypto';

// Cache de IDs de bancas por slug
const bancaIdCache = new Map<string, number>();

/**
 * Busca ID numérico da banca pelo slug
 */
export async function getBancaId(slug: string): Promise<number> {
  if (bancaIdCache.has(slug)) {
    return bancaIdCache.get(slug)!;
  }
  
  const { rows } = await pool.query(
    'SELECT id FROM bancas WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [slug]
  );
  
  if (rows.length === 0) {
    throw new Error(`Banca não encontrada: ${slug}`);
  }
  
  const id = rows[0].id;
  bancaIdCache.set(slug, id);
  return id;
}

export function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

/**
 * Insere ou atualiza um concurso descoberto
 * Adaptado para schema do MemoDrops (tabela concursos)
 */
export async function upsertContest(bancaId: number, externalId: string, data: any) {
  const { title, url, status, raw } = data;
  
  await pool.query(`
    INSERT INTO concursos (banca_id, external_id, nome, url, status, metadata, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, now(), now())
    ON CONFLICT (banca_id, external_id) 
    DO UPDATE SET 
      nome = EXCLUDED.nome,
      url = EXCLUDED.url,
      status = COALESCE(EXCLUDED.status, concursos.status),
      metadata = COALESCE(EXCLUDED.metadata, concursos.metadata),
      updated_at = now()
  `, [bancaId, externalId, title, url, status || 'descoberto', raw || {}]);
}

/**
 * Registra atualização detectada em concurso
 */
export async function logUpdate(bancaId: number, externalId: string, title: string, url: string) {
  const currentHash = sha256(`${bancaId}|${externalId}|${title}|${url}`);
  
  await pool.query(`
    INSERT INTO contest_updates (banca_id, external_id, title, url, current_hash, discovered_at)
    VALUES ($1, $2, $3, $4, $5, now())
  `, [bancaId, externalId, title, url, currentHash]);
}

/**
 * Adiciona URL bloqueada à fila de revisão manual
 */
export async function enqueueReview(bancaId: number, url: string, reason: string) {
  await pool.query(`
    INSERT INTO manual_reviews (banca_id, url, reason, status, created_at)
    VALUES ($1, $2, $3, 'open', now())
    ON CONFLICT DO NOTHING
  `, [bancaId, url, reason]);
  
  console.log(`[Review Queue] Added: ${url} (${reason})`);
}
