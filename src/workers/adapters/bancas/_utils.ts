import { pool } from '../../utils/db.js';
import { createHash } from 'crypto';

// Cache de IDs de bancas por slug
const bancaIdCache = new Map<string, number>();

/**
 * Busca ID numérico da banca pelo slug (name)
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
 * 
 * Mapeamento de colunas:
 * - external_id: ID na fonte original
 * - name: título do concurso
 * - contest_url: URL do concurso
 * - status: status do concurso
 * - informacoes_scraper: metadados JSON
 */
export async function upsertContest(bancaId: number, externalId: string, data: any) {
  const { title, url, status, raw } = data;
  
  await pool.query(`
    INSERT INTO concursos (
      banca_id, 
      external_id, 
      name, 
      contest_url, 
      status, 
      informacoes_scraper, 
      scraped_at,
      created_at, 
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
    ON CONFLICT (banca_id, external_id)
    DO UPDATE SET 
      name = EXCLUDED.name,
      contest_url = EXCLUDED.contest_url,
      status = COALESCE(EXCLUDED.status, concursos.status),
      informacoes_scraper = COALESCE(EXCLUDED.informacoes_scraper, concursos.informacoes_scraper),
      scraped_at = NOW(),
      updated_at = NOW()
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
