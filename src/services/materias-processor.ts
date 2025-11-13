import { pool } from '../db/connection.js';
import { downloadPdf, deletePdf } from './pdf-downloader.js';
import { extractTextFromPdfPages, cleanPdfText } from './pdf-text-extractor.js';
import { extractMateriasWithRetry } from './materias-gpt-extractor.js';

interface ProcessMateriasResult {
  success: boolean;
  materias_count: number;
  error?: string;
}

/**
 * Processa matérias de um concurso:
 * 1. Baixa PDF do edital
 * 2. Extrai texto
 * 3. Usa GPT-4 para extrair matérias
 * 4. Salva no banco
 */
export async function processContestMaterias(
  contestId: string,
  editalUrl: string,
  contestName: string
): Promise<ProcessMateriasResult> {
  let pdfPath: string | null = null;
  
  try {
    console.log(`[Materias Processor] Processando matérias para concurso ${contestId}...`);
    
    // 1. Verificar se já tem matérias cadastradas
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) as count FROM materias WHERE contest_id = $1',
      [contestId]
    );
    
    if (existing[0]?.count > 0) {
      console.log(`[Materias Processor] Concurso já tem ${existing[0].count} matérias cadastradas`);
      return {
        success: true,
        materias_count: parseInt(existing[0].count),
      };
    }
    
    // 2. Baixar PDF
    console.log(`[Materias Processor] Baixando PDF do edital...`);
    pdfPath = await downloadPdf(editalUrl, contestId);
    
    // 3. Extrair texto (primeiras 20 páginas para economizar tempo)
    console.log(`[Materias Processor] Extraindo texto do PDF...`);
    const rawText = await extractTextFromPdfPages(pdfPath, 20);
    const cleanText = cleanPdfText(rawText);
    
    if (cleanText.length < 500) {
      throw new Error('Texto extraído muito curto ou vazio');
    }
    
    // 4. Extrair matérias com GPT-4
    console.log(`[Materias Processor] Extraindo matérias com GPT-4...`);
    const result = await extractMateriasWithRetry(cleanText, contestName);
    
    if (result.materias.length === 0) {
      console.warn(`[Materias Processor] Nenhuma matéria encontrada`);
      return {
        success: true,
        materias_count: 0,
      };
    }
    
    // 5. Salvar matérias no banco
    console.log(`[Materias Processor] Salvando ${result.materias.length} matérias no banco...`);
    
    for (const materia of result.materias) {
      await pool.query(
        `INSERT INTO materias (contest_id, name, created_at) 
         VALUES ($1, $2, NOW())
         ON CONFLICT (contest_id, name) DO NOTHING`,
        [contestId, materia]
      );
    }
    
    console.log(`[Materias Processor] ✅ ${result.materias.length} matérias processadas com sucesso`);
    
    return {
      success: true,
      materias_count: result.materias.length,
    };
    
  } catch (error: any) {
    console.error(`[Materias Processor] ❌ Erro ao processar matérias:`, error.message);
    
    return {
      success: false,
      materias_count: 0,
      error: error.message,
    };
    
  } finally {
    // Limpar PDF temporário
    if (pdfPath) {
      deletePdf(pdfPath);
    }
  }
}

/**
 * Processa matérias de múltiplos concursos em lote
 */
export async function processBatchMaterias(
  contests: Array<{ id: string; edital_url: string; name: string }>
): Promise<{ processed: number; failed: number; total_materias: number }> {
  let processed = 0;
  let failed = 0;
  let total_materias = 0;
  
  console.log(`[Materias Processor] Processando ${contests.length} concursos em lote...`);
  
  for (const contest of contests) {
    try {
      if (!contest.edital_url) {
        console.warn(`[Materias Processor] Concurso ${contest.id} sem URL de edital`);
        failed++;
        continue;
      }
      
      const result = await processContestMaterias(
        contest.id,
        contest.edital_url,
        contest.name
      );
      
      if (result.success) {
        processed++;
        total_materias += result.materias_count;
      } else {
        failed++;
      }
      
      // Aguardar 2 segundos entre requisições para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error(`[Materias Processor] Erro no concurso ${contest.id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`[Materias Processor] Lote concluído: ${processed} processados, ${failed} falharam, ${total_materias} matérias totais`);
  
  return { processed, failed, total_materias };
}
