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
 * - edital_url: URL do PDF do edital (extraído automaticamente)
 * - status: status do concurso
 * - informacoes_scraper: metadados JSON
 */
export async function upsertContest(bancaId: number, externalId: string, data: any) {
  const { title, url, status, raw, editalUrl } = data;
  
  // Gerar slug a partir do título
  const slug = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por -
    .replace(/^-+|-+$/g, ''); // Remove - do início/fim
  
  // Tentar inserir, se houver conflito de slug, adicionar sufixo
  let finalSlug = slug;
  let attempt = 0;
  
  while (attempt < 10) {
    try {
      await pool.query(`
        INSERT INTO concursos (
          banca_id, 
          external_id, 
          name, 
          slug,
          contest_url,
          edital_url,
          status, 
          informacoes_scraper, 
          scraped_at,
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
        ON CONFLICT (banca_id, external_id)
        DO UPDATE SET 
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          contest_url = EXCLUDED.contest_url,
          edital_url = COALESCE(EXCLUDED.edital_url, concursos.edital_url),
          status = COALESCE(EXCLUDED.status, concursos.status),
          informacoes_scraper = COALESCE(EXCLUDED.informacoes_scraper, concursos.informacoes_scraper),
          scraped_at = NOW(),
          updated_at = NOW()
      `, [bancaId, externalId, title, finalSlug, url, editalUrl || null, status || 'descoberto', raw || {}]);
      break; // Sucesso, sair do loop
    } catch (error: any) {
      if (error.message?.includes('concursos_slug_key')) {
        // Conflito de slug, tentar com sufixo
        attempt++;
        finalSlug = `${slug}-${attempt}`;
      } else {
        throw error; // Outro erro, propagar
      }
    }
  }
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
