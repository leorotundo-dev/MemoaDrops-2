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
    // Se encontrou páginas relevantes, extrair apenas essas
    // Caso contrário, extrair todo o PDF
    const pdfText = await extractTextFromPdf(pdfPath);
    
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
    
    // 4.5. Extrair informações do concurso via GPT-4
    console.log('[Hierarquia Processor] Extraindo informações do concurso via GPT-4...');
    const { extractConcursoInfoFromText } = await import('./hierarquia-gpt-extractor.js');
    const concursoInfo = await extractConcursoInfoFromText(pdfText);
    
    // Atualizar informações do concurso no banco
    if (concursoInfo.confidence !== 'low') {
      console.log('[Hierarquia Processor] Atualizando informações do concurso...');
      await client.query(
        `UPDATE concursos SET
          orgao = COALESCE($2, orgao),
          ano = COALESCE($3, ano),
          nivel = COALESCE($4, nivel),
          estado = COALESCE($5, estado),
          cidade = COALESCE($6, cidade),
          numero_vagas = COALESCE($7, numero_vagas),
          salario_min = COALESCE($8, salario_min),
          salario_max = COALESCE($9, salario_max),
          data_inscricao_inicio = COALESCE($10, data_inscricao_inicio),
          data_inscricao_fim = COALESCE($11, data_inscricao_fim),
          data_prova = COALESCE($12, data_prova),
          data_resultado = COALESCE($13, data_resultado),
          valor_inscricao = COALESCE($14, valor_inscricao),
          requisitos = COALESCE($15, requisitos),
          tipo_prova = COALESCE($16, tipo_prova),
          carga_horaria = COALESCE($17, carga_horaria),
          regime_juridico = COALESCE($18, regime_juridico),
          jornada_trabalho = COALESCE($19, jornada_trabalho),
          beneficios = COALESCE($20, beneficios)
        WHERE id = $1`,
        [
          contestId,
          concursoInfo.orgao,
          concursoInfo.ano,
          concursoInfo.nivel,
          concursoInfo.estado,
          concursoInfo.cidade,
          concursoInfo.numero_vagas,
          concursoInfo.salario_min,
          concursoInfo.salario_max,
          concursoInfo.data_inscricao_inicio,
          concursoInfo.data_inscricao_fim,
          concursoInfo.data_prova,
          concursoInfo.data_resultado,
          concursoInfo.valor_inscricao,
          concursoInfo.requisitos,
          concursoInfo.tipo_prova,
          concursoInfo.carga_horaria,
          concursoInfo.regime_juridico,
          concursoInfo.jornada_trabalho,
          concursoInfo.beneficios
        ]
      );
      console.log('[Hierarquia Processor] Informações do concurso atualizadas com sucesso');
    }
    
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
        for (const topico of materia.topicos) {
          const topicoSlug = generateSlug(topico.titulo);
          
          const topicoResult = await client.query(
            `INSERT INTO topicos (materia_id, nome, slug, descricao, ordem)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (materia_id, slug) DO UPDATE
             SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, ordem = EXCLUDED.ordem
             RETURNING id`,
            [materiaId, topico.titulo, topicoSlug, `Tópico ${topico.numero}`, topico.numero - 1]
          );
          
          const topicoId = topicoResult.rows[0].id;
          topicosCount++;
          
          // Salvar subtópicos
          if (topico.subtopicos && topico.subtopicos.length > 0) {
            for (let j = 0; j < topico.subtopicos.length; j++) {
              const subtopico = topico.subtopicos[j];
              const subtopicoSlug = generateSlug(subtopico.nome);
              
              await client.query(
                `INSERT INTO subtopicos (topico_id, nome, slug, descricao, ordem)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (topico_id, slug) DO UPDATE
                 SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, ordem = EXCLUDED.ordem`,
                [topicoId, subtopico.nome, subtopicoSlug, null, j]
              );
              
              subtopicosCount++;
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
