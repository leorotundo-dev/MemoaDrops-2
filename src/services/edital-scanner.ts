import { db } from '../db/index.js';
import { processHierarquiaForContest } from './hierarquia-processor.js';

interface ScanResult {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  results: Array<{
    concursoId: string;
    concursoNome: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
}

/**
 * Varre todos os concursos e processa os editais que ainda não foram processados
 */
export async function scanAllEditais(): Promise<ScanResult> {
  const result: ScanResult = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    results: []
  };

  try {
    // Buscar todos os concursos que têm contest_url mas não têm matérias processadas
    const concursos = await db.raw(`
      SELECT 
        c.id,
        c.name,
        c.contest_url,
        c.edital_url,
        COUNT(m.id) as materias_count
      FROM concursos c
      LEFT JOIN materias m ON m.contest_id = c.id
      WHERE c.contest_url IS NOT NULL
      GROUP BY c.id, c.name, c.contest_url, c.edital_url
      HAVING COUNT(m.id) = 0
      ORDER BY c.created_at DESC
    `);

    result.total = concursos.rows.length;

    console.log(`[Edital Scanner] Encontrados ${result.total} concursos para processar`);

    // Processar cada concurso
    for (const concurso of concursos.rows) {
      const editalUrl = concurso.edital_url || concurso.contest_url;
      
      console.log(`[Edital Scanner] Processando: ${concurso.name}`);
      console.log(`[Edital Scanner] URL: ${editalUrl}`);

      try {
        // Processar hierarquia do concurso
        const processResult = await processHierarquiaForContest(
          concurso.id,
          editalUrl
        );

        if (processResult.success) {
          result.processed++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            status: 'success'
          });
          console.log(`[Edital Scanner] ✅ Sucesso: ${concurso.name}`);
        } else {
          result.failed++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            status: 'failed',
            error: processResult.error
          });
          console.log(`[Edital Scanner] ❌ Falha: ${concurso.name} - ${processResult.error}`);
        }
      } catch (error: any) {
        result.failed++;
        result.results.push({
          concursoId: concurso.id,
          concursoNome: concurso.name,
          status: 'failed',
          error: error.message
        });
        console.error(`[Edital Scanner] ❌ Erro ao processar ${concurso.name}:`, error);
      }

      // Aguardar 2 segundos entre processamentos para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[Edital Scanner] Varredura concluída!`);
    console.log(`[Edital Scanner] Total: ${result.total}`);
    console.log(`[Edital Scanner] Processados: ${result.processed}`);
    console.log(`[Edital Scanner] Falhados: ${result.failed}`);
    console.log(`[Edital Scanner] Pulados: ${result.skipped}`);

    return result;
  } catch (error: any) {
    console.error('[Edital Scanner] Erro na varredura:', error);
    throw error;
  }
}

/**
 * Varre apenas concursos de uma banca específica
 */
export async function scanEditalsByBanca(bancaId: number): Promise<ScanResult> {
  const result: ScanResult = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    results: []
  };

  try {
    // Buscar concursos da banca que não têm matérias processadas
    const concursos = await db.raw(`
      SELECT 
        c.id,
        c.nome,
        c.contest_url,
        c.edital_url,
        COUNT(m.id) as materias_count
      FROM concursos c
      LEFT JOIN materias m ON m.contest_id = c.id
      WHERE c.banca_id = ?
        AND c.contest_url IS NOT NULL
      GROUP BY c.id, c.nome, c.contest_url, c.edital_url
      HAVING COUNT(m.id) = 0
      ORDER BY c.created_at DESC
    `, [bancaId]);

    result.total = concursos.rows.length;

    console.log(`[Edital Scanner] Encontrados ${result.total} concursos da banca ${bancaId} para processar`);

    // Processar cada concurso
    for (const concurso of concursos.rows) {
      const editalUrl = concurso.edital_url || concurso.contest_url;
      
      console.log(`[Edital Scanner] Processando: ${concurso.name}`);

      try {
        const processResult = await processHierarquiaForContest(
          concurso.id,
          editalUrl
        );

        if (processResult.success) {
          result.processed++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            status: 'success'
          });
        } else {
          result.failed++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            status: 'failed',
            error: processResult.error
          });
        }
      } catch (error: any) {
        result.failed++;
        result.results.push({
          concursoId: concurso.id,
          concursoNome: concurso.name,
          status: 'failed',
          error: error.message
        });
      }

      // Aguardar 2 segundos entre processamentos
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return result;
  } catch (error: any) {
    console.error('[Edital Scanner] Erro na varredura por banca:', error);
    throw error;
  }
}
