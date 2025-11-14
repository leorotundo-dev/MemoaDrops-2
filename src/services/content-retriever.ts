import { pool } from '../db/connection.js';

export interface ContentChunk {
  id: string;
  source_id: string;
  source_label: string;
  doc_title: string;
  doc_url: string;
  text_snippet: string;
  license: string;
  relevance_score?: number;
}

export interface RetrievalResult {
  chunks: ContentChunk[];
  total_found: number;
  sources_used: string[];
}

/**
 * Busca conteúdo didático relevante nas fontes cadastradas
 * Estratégia: Busca por palavra-chave (keyword matching)
 * 
 * @param query - Termo de busca (ex: "Constituição Federal de 1988")
 * @param options - Opções de busca
 * @returns Chunks de conteúdo relevantes com metadados
 */
export async function retrieveContent(
  query: string,
  options?: {
    limit?: number;
    categories?: string[]; // Filtrar por categoria (lei-seca, jurisprudencia, oer)
    sources?: string[]; // Filtrar por fonte específica
  }
): Promise<RetrievalResult> {
  try {
    console.log(`[Content Retriever] Buscando conteúdo para: "${query}"`);
    
    const limit = options?.limit || 5;
    const categories = options?.categories || [];
    const sources = options?.sources || [];
    
    // Preparar query SQL
    let sql = `
      SELECT 
        dc.id,
        dc.text_snippet,
        d.title as doc_title,
        d.url as doc_url,
        d.license,
        s.id as source_id,
        s.label as source_label,
        s.categories
      FROM doc_chunks dc
      JOIN docs d ON dc.doc_id = d.id
      JOIN sources s ON d.source_id = s.id
      WHERE dc.text_snippet ILIKE $1
    `;
    
    const params: any[] = [`%${query}%`];
    let paramCount = 1;
    
    // Filtrar por categorias se especificado
    if (categories.length > 0) {
      paramCount++;
      sql += ` AND s.categories && $${paramCount}`;
      params.push(categories);
    }
    
    // Filtrar por fontes se especificado
    if (sources.length > 0) {
      paramCount++;
      sql += ` AND s.id = ANY($${paramCount})`;
      params.push(sources);
    }
    
    sql += ` ORDER BY dc.ordinal ASC LIMIT $${paramCount + 1}`;
    params.push(limit);
    
    const result = await pool.query(sql, params);
    
    console.log(`[Content Retriever] Encontrados ${result.rows.length} chunks`);
    
    // Mapear resultados
    const chunks: ContentChunk[] = result.rows.map(row => ({
      id: row.id,
      source_id: row.source_id,
      source_label: row.source_label,
      doc_title: row.doc_title,
      doc_url: row.doc_url,
      text_snippet: row.text_snippet,
      license: row.license
    }));
    
    // Extrair fontes únicas utilizadas
    const sourcesUsed = [...new Set(chunks.map(c => c.source_label))];
    
    return {
      chunks,
      total_found: result.rows.length,
      sources_used: sourcesUsed
    };
    
  } catch (error: any) {
    console.error(`[Content Retriever] Erro:`, error.message);
    return {
      chunks: [],
      total_found: 0,
      sources_used: []
    };
  }
}

/**
 * Busca conteúdo com estratégia multi-termo
 * Útil para subtópicos compostos (ex: "Lei 8.080/1990 e Lei 8.142/1990")
 */
export async function retrieveContentMultiTerm(
  terms: string[],
  options?: {
    limit?: number;
    categories?: string[];
    sources?: string[];
  }
): Promise<RetrievalResult> {
  console.log(`[Content Retriever] Busca multi-termo: ${terms.length} termos`);
  
  const allChunks: ContentChunk[] = [];
  const allSources = new Set<string>();
  
  // Buscar para cada termo
  for (const term of terms) {
    const result = await retrieveContent(term, {
      ...options,
      limit: Math.ceil((options?.limit || 5) / terms.length)
    });
    
    allChunks.push(...result.chunks);
    result.sources_used.forEach(s => allSources.add(s));
  }
  
  // Remover duplicatas por ID
  const uniqueChunks = allChunks.filter((chunk, index, self) =>
    index === self.findIndex(c => c.id === chunk.id)
  );
  
  // Limitar ao total solicitado
  const limitedChunks = uniqueChunks.slice(0, options?.limit || 5);
  
  return {
    chunks: limitedChunks,
    total_found: limitedChunks.length,
    sources_used: Array.from(allSources)
  };
}

/**
 * Busca conteúdo priorizando categorias específicas
 * Útil para direcionar busca (ex: lei-seca para tópicos jurídicos)
 */
export async function retrieveContentByCategoryPriority(
  query: string,
  categoryPriority: string[],
  options?: {
    limit?: number;
  }
): Promise<RetrievalResult> {
  console.log(`[Content Retriever] Busca com prioridade: ${categoryPriority.join(', ')}`);
  
  const allChunks: ContentChunk[] = [];
  const allSources = new Set<string>();
  const limitPerCategory = Math.ceil((options?.limit || 5) / categoryPriority.length);
  
  // Buscar em cada categoria na ordem de prioridade
  for (const category of categoryPriority) {
    const result = await retrieveContent(query, {
      limit: limitPerCategory,
      categories: [category]
    });
    
    allChunks.push(...result.chunks);
    result.sources_used.forEach(s => allSources.add(s));
    
    // Se já atingiu o limite, parar
    if (allChunks.length >= (options?.limit || 5)) {
      break;
    }
  }
  
  // Limitar ao total solicitado
  const limitedChunks = allChunks.slice(0, options?.limit || 5);
  
  return {
    chunks: limitedChunks,
    total_found: limitedChunks.length,
    sources_used: Array.from(allSources)
  };
}
