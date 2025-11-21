import axios from 'axios';
import * as cheerio from 'cheerio';
import { pool } from '../db/connection.js';

interface EditalExtractionResult {
  concursoId: string;
  concursoNome: string;
  editalUrl: string | null;
  success: boolean;
  error?: string;
}

/**
 * Extrai URL do PDF do edital a partir da página do concurso
 */
async function extractEditalUrlFromPage(contestUrl: string, bancaName: string): Promise<string | null> {
  try {
    console.log(`[Edital Extractor] Acessando: ${contestUrl}`);
    
    const response = await axios.get(contestUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Estratégias específicas por banca
    let editalUrl: string | null = null;

    switch (bancaName.toLowerCase()) {
      case 'fgv':
        // FGV: procurar link com texto "Edital" ou href contendo "edital"
        editalUrl = $('a:contains("Edital")').first().attr('href') ||
                    $('a[href*="edital"]').first().attr('href') ||
                    $('a[href$=".pdf"]').first().attr('href') || null;
        break;

      case 'fundatec':
        // FUNDATEC: procurar na seção de documentos
        editalUrl = $('a[href*="edital"]').first().attr('href') ||
                    $('a:contains("Edital")').first().attr('href') ||
                    $('.documentos a[href$=".pdf"]').first().attr('href') || null;
        break;

      case 'fcc':
        // FCC: procurar em área de downloads
        editalUrl = $('a:contains("Edital")').first().attr('href') ||
                    $('a[href*="edital"]').first().attr('href') ||
                    $('.downloads a[href$=".pdf"]').first().attr('href') || null;
        break;

      case 'quadrix':
        // QUADRIX: procurar em documentos
        editalUrl = $('a:contains("Edital")').first().attr('href') ||
                    $('a[href*="edital"]').first().attr('href') ||
                    $('a[href$=".pdf"]').first().attr('href') || null;
        break;

      case 'vunesp':
        // VUNESP: procurar em área de editais
        editalUrl = $('a:contains("Edital")').first().attr('href') ||
                    $('a[href*="edital"]').first().attr('href') ||
                    $('.editais a[href$=".pdf"]').first().attr('href') || null;
        break;

      case 'aocp':
      case 'ibade':
      case 'cebraspe':
      case 'idecan':
      case 'ibfc':
        // Estratégia genérica para outras bancas
        editalUrl = $('a:contains("Edital")').first().attr('href') ||
                    $('a[href*="edital"]').first().attr('href') ||
                    $('a[href$=".pdf"]').first().attr('href') || null;
        break;

      default:
        // Fallback: procurar qualquer link com "edital" ou PDF
        editalUrl = $('a:contains("Edital")').first().attr('href') ||
                    $('a[href*="edital"]').first().attr('href') ||
                    $('a[href$=".pdf"]').first().attr('href') || null;
    }

    if (editalUrl) {
      // Converter URL relativa para absoluta
      if (editalUrl.startsWith('/')) {
        const baseUrl = new URL(contestUrl);
        editalUrl = `${baseUrl.protocol}//${baseUrl.host}${editalUrl}`;
      } else if (!editalUrl.startsWith('http')) {
        const basePath = contestUrl.substring(0, contestUrl.lastIndexOf('/') + 1);
        editalUrl = basePath + editalUrl;
      }

      console.log(`[Edital Extractor] ✅ Encontrado: ${editalUrl}`);
      return editalUrl;
    }

    console.log(`[Edital Extractor] ❌ Nenhum edital encontrado`);
    return null;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[Edital Extractor] Erro ao acessar ${contestUrl}:`, errorMessage);
    return null;
  }
}

/**
 * Extrai URLs de editais para todos os concursos sem edital_url
 */
export async function extractAllEditalUrls(): Promise<{
  total: number;
  extracted: number;
  failed: number;
  results: EditalExtractionResult[];
}> {
  const result = {
    total: 0,
    extracted: 0,
    failed: 0,
    results: [] as EditalExtractionResult[]
  };

  try {
    // Buscar concursos sem edital_url
    const concursosResult = await pool.query(`
      SELECT c.id, c.name, c.contest_url, b.name as banca_name
      FROM concursos c
      JOIN bancas b ON c.banca_id = b.id
      WHERE c.contest_url IS NOT NULL
        AND (c.edital_url IS NULL OR c.edital_url = '')
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    const concursos = concursosResult.rows;
    result.total = concursos.length;
    console.log(`[Edital Extractor] Encontrados ${result.total} concursos para processar`);

    for (const concurso of concursos) {
      console.log(`\n[Edital Extractor] Processando: ${concurso.name}`);

      try {
        const editalUrl = await extractEditalUrlFromPage(concurso.contest_url, concurso.banca_name);

        if (editalUrl) {
          // Atualizar banco de dados
          await pool.query(
            'UPDATE concursos SET edital_url = $1, updated_at = NOW() WHERE id = $2',
            [editalUrl, concurso.id]
          );

          result.extracted++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            editalUrl,
            success: true
          });

          console.log(`[Edital Extractor] ✅ Atualizado no banco`);
        } else {
          result.failed++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            editalUrl: null,
            success: false,
            error: 'Edital não encontrado na página'
          });
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.failed++;
        result.results.push({
          concursoId: concurso.id,
          concursoNome: concurso.name,
          editalUrl: null,
          success: false,
          error: errorMessage
        });
        console.error(`[Edital Extractor] ❌ Erro:`, errorMessage);
      }

      // Delay de 1 segundo entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n[Edital Extractor] Concluído!`);
    console.log(`[Edital Extractor] Total: ${result.total}`);
    console.log(`[Edital Extractor] Extraídos: ${result.extracted}`);
    console.log(`[Edital Extractor] Falhados: ${result.failed}`);

    return result;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Edital Extractor] Erro fatal:', errorMessage);
    throw error;
  }
}

/**
 * Extrai URLs de editais apenas para concursos de uma banca específica
 */
export async function extractEditalUrlsByBanca(bancaName: string): Promise<{
  total: number;
  extracted: number;
  failed: number;
  results: EditalExtractionResult[];
}> {
  const result = {
    total: 0,
    extracted: 0,
    failed: 0,
    results: [] as EditalExtractionResult[]
  };

  try {
    const concursosResult = await pool.query(`
      SELECT c.id, c.name, c.contest_url, b.name as banca_name
      FROM concursos c
      JOIN bancas b ON c.banca_id = b.id
      WHERE b.name = $1
        AND c.contest_url IS NOT NULL
        AND (c.edital_url IS NULL OR c.edital_url = '')
      ORDER BY c.created_at DESC
      LIMIT 100
    `, [bancaName]);

    const concursos = concursosResult.rows;
    result.total = concursos.length;
    console.log(`[Edital Extractor] Encontrados ${result.total} concursos da banca ${bancaName}`);

    for (const concurso of concursos) {
      console.log(`\n[Edital Extractor] Processando: ${concurso.name}`);

      try {
        const editalUrl = await extractEditalUrlFromPage(concurso.contest_url, concurso.banca_name);

        if (editalUrl) {
          await pool.query(
            'UPDATE concursos SET edital_url = $1, updated_at = NOW() WHERE id = $2',
            [editalUrl, concurso.id]
          );

          result.extracted++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            editalUrl,
            success: true
          });
        } else {
          result.failed++;
          result.results.push({
            concursoId: concurso.id,
            concursoNome: concurso.name,
            editalUrl: null,
            success: false,
            error: 'Edital não encontrado na página'
          });
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.failed++;
        result.results.push({
          concursoId: concurso.id,
          concursoNome: concurso.name,
          editalUrl: null,
          success: false,
          error: errorMessage
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return result;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Edital Extractor] Erro fatal:', errorMessage);
    throw error;
  }
}
