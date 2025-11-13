import { pool } from '../db/connection.js';
import { downloadPdf } from './pdf-downloader.js';
import { extractTextFromPdf } from './pdf-text-extractor.js';
import { findRelevantPages } from './pdf-page-finder.js';
import { extractHierarquiaFromText, generateSlug } from './hierarquia-gpt-extractor.js';

interface ProcessHierarquiaResult {
  success: boolean;
  materiasCount: number;
  topicosCount: number;
  subtopicosCount: number;
  subsubtopicosCount: number;
  error?: string;
}

/**
 * Processa hierarquia completa de um concurso:
 * 1. Baixa PDF do edital
 * 2. Busca páginas relevantes
 * 3. Extrai texto
 * 4. Usa GPT-4 para extrair hierarquia
 * 5. Salva no banco (materias → topicos → subtopicos → subsubtopicos)
 */
export async function processHierarquiaForContest(
  contestId: string,
  editalUrl: string
): Promise<ProcessHierarquiaResult> {
  const client = await pool.connect();
  
  try {
    console.log(`[Hierarquia Processor] Processando hierarquia para concurso ${contestId}`);
    
    // 1. Baixar PDF
    console.log('[Hierarquia Processor] Baixando PDF...');
    const pdfPath = await downloadPdf(editalUrl, contestId);
    
    // 2. Buscar páginas relevantes
    console.log('[Hierarquia Processor] Buscando páginas relevantes...');
    const relevantPages = await findRelevantPages(pdfPath);
    
    // 3. Extrair texto das páginas relevantes
    console.log('[Hierarquia Processor] Extraindo texto...');
    const pdfText = await extractTextFromPdf(pdfPath, relevantPages);
    
    if (!pdfText || pdfText.length < 100) {
      console.log('[Hierarquia Processor] Texto extraído muito curto ou vazio');
      return {
        success: false,
        materiasCount: 0,
        topicosCount: 0,
        subtopicosCount: 0,
        subsubtopicosCount: 0,
        error: 'Texto extraído insuficiente'
      };
    }
    
    // 4. Extrair hierarquia via GPT-4
    console.log('[Hierarquia Processor] Extraindo hierarquia via GPT-4...');
    const hierarquia = await extractHierarquiaFromText(pdfText);
    
    if (!hierarquia.materias || hierarquia.materias.length === 0) {
      console.log('[Hierarquia Processor] Nenhuma matéria encontrada');
      
      // Salvar matéria fallback "Consulte o Edital"
      await client.query(
        `INSERT INTO materias (contest_id, nome, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (contest_id, slug) DO NOTHING`,
        [contestId, 'Consulte o Edital', 'consulte-o-edital']
      );
      
      return {
        success: true,
        materiasCount: 1,
        topicosCount: 0,
        subtopicosCount: 0,
        subsubtopicosCount: 0
      };
    }
    
    // 5. Salvar hierarquia no banco
    console.log(`[Hierarquia Processor] Salvando ${hierarquia.materias.length} matérias...`);
    
    let topicosCount = 0;
    let subtopicosCount = 0;
    let subsubtopicosCount = 0;
    
    await client.query('BEGIN');
    
    for (const materia of hierarquia.materias) {
      // Salvar matéria
      const materiaSlug = generateSlug(materia.nome);
      const materiaResult = await client.query(
        `INSERT INTO materias (contest_id, nome, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (contest_id, slug) DO UPDATE
         SET nome = EXCLUDED.nome
         RETURNING id`,
        [contestId, materia.nome, materiaSlug]
      );
      
      const materiaId = materiaResult.rows[0].id;
      
      // Salvar tópicos
      if (materia.topicos && materia.topicos.length > 0) {
        for (let i = 0; i < materia.topicos.length; i++) {
          const topico = materia.topicos[i];
          const topicoSlug = generateSlug(topico.nome);
          
          const topicoResult = await client.query(
            `INSERT INTO topicos (materia_id, nome, slug, descricao, ordem)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (materia_id, slug) DO UPDATE
             SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, ordem = EXCLUDED.ordem
             RETURNING id`,
            [materiaId, topico.nome, topicoSlug, topico.descricao || null, i]
          );
          
          const topicoId = topicoResult.rows[0].id;
          topicosCount++;
          
          // Salvar subtópicos
          if (topico.subtopicos && topico.subtopicos.length > 0) {
            for (let j = 0; j < topico.subtopicos.length; j++) {
              const subtopico = topico.subtopicos[j];
              const subtopicoSlug = generateSlug(subtopico.nome);
              
              const subtopicoResult = await client.query(
                `INSERT INTO subtopicos (topico_id, nome, slug, descricao, ordem)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (topico_id, slug) DO UPDATE
                 SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, ordem = EXCLUDED.ordem
                 RETURNING id`,
                [topicoId, subtopico.nome, subtopicoSlug, subtopico.descricao || null, j]
              );
              
              const subtopicoId = subtopicoResult.rows[0].id;
              subtopicosCount++;
              
              // Salvar sub-subtópicos
              if (subtopico.subsubtopicos && subtopico.subsubtopicos.length > 0) {
                for (let k = 0; k < subtopico.subsubtopicos.length; k++) {
                  const subsubtopico = subtopico.subsubtopicos[k];
                  const subsubtopicoSlug = generateSlug(subsubtopico.nome);
                  
                  await client.query(
                    `INSERT INTO subsubtopicos (subtopico_id, nome, slug, descricao, ordem)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (subtopico_id, slug) DO UPDATE
                     SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, ordem = EXCLUDED.ordem`,
                    [subtopicoId, subsubtopico.nome, subsubtopicoSlug, subsubtopico.descricao || null, k]
                  );
                  
                  subsubtopicosCount++;
                }
              }
            }
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('[Hierarquia Processor] ✅ Hierarquia salva com sucesso!');
    console.log(`[Hierarquia Processor] Matérias: ${hierarquia.materias.length}`);
    console.log(`[Hierarquia Processor] Tópicos: ${topicosCount}`);
    console.log(`[Hierarquia Processor] Subtópicos: ${subtopicosCount}`);
    console.log(`[Hierarquia Processor] Sub-subtópicos: ${subsubtopicosCount}`);
    
    return {
      success: true,
      materiasCount: hierarquia.materias.length,
      topicosCount,
      subtopicosCount,
      subsubtopicosCount
    };
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Hierarquia Processor] Erro ao processar hierarquia:', error.message);
    return {
      success: false,
      materiasCount: 0,
      topicosCount: 0,
      subtopicosCount: 0,
      subsubtopicosCount: 0,
      error: error.message
    };
  } finally {
    client.release();
  }
}
