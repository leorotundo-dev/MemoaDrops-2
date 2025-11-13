import axios from 'axios';
import * as cheerio from 'cheerio';
import { pool } from '../db/connection.js';
import { extractCopeveConcursoData } from './extractors/copeve-extractor.js';
import { extractFuncernConcursoData } from './extractors/funcern-extractor.js';
import { extractFgvConcursoData } from './extractors/fgv-extractor.js';

/**
 * Interface para dados extraídos de um concurso
 */
interface ExtractedContestData {
  salario?: string | number;
  numero_vagas?: number;
  data_prova?: string;
  orgao?: string;
  cidade?: string;
  estado?: string;
  nivel?: string;
  ano?: number;
  edital_url?: string;
  materias?: string[];
}

/**
 * Detecta a banca a partir da URL
 */
function detectBanca(url: string): string | null {
  if (url.includes('copeve.ufal.br')) return 'copeve';
  if (url.includes('funcern.br')) return 'funcern';
  if (url.includes('fgv.br')) return 'fgv';
  if (url.includes('quadrix.org.br')) return 'quadrix';
  if (url.includes('fundatec.org.br')) return 'fundatec';
  if (url.includes('concursosfcc.com.br')) return 'fcc';
  if (url.includes('vunesp.com.br')) return 'vunesp';
  if (url.includes('objetivas.com.br')) return 'objetivas';
  return null;
}

/**
 * Extrai dados detalhados de um concurso usando extractor específico da banca
 */
export async function extractContestData(contestId: string, contestUrl: string, bancaSlug?: string): Promise<ExtractedContestData> {
  try {
    console.log(`[Contest Extractor] Extraindo dados do concurso ${contestId} de ${contestUrl}`);

    const banca = bancaSlug || detectBanca(contestUrl);
    let extractedData: ExtractedContestData = {};

    // Usar extractor específico se disponível
    if (banca === 'copeve') {
      const copeveData = await extractCopeveConcursoData(contestUrl);
      extractedData = {
        salario: copeveData.salario,
        numero_vagas: copeveData.numero_vagas,
        data_prova: copeveData.data_prova,
        edital_url: copeveData.edital_url,
        nivel: copeveData.escolaridade?.includes('Superior') ? 'superior' : 
               copeveData.escolaridade?.includes('Médio') ? 'médio' : undefined,
      };
    } else if (banca === 'funcern') {
      const funcernData = await extractFuncernConcursoData(contestUrl);
      extractedData = {
        edital_url: funcernData.edital_url,
      };
      // Extrair ano do número do edital (ex: 01/2024 -> 2024)
      if (funcernData.edital_numero) {
        const anoMatch = funcernData.edital_numero.match(/\/(\d{4})/);
        if (anoMatch) {
          extractedData.ano = parseInt(anoMatch[1]);
        }
      }
    } else if (banca === 'fgv') {
      const fgvData = await extractFgvConcursoData(contestUrl);
      extractedData = {
        edital_url: fgvData.edital_url,
      };
    } else {
      // Fallback: usar extractor genérico
      extractedData = await extractGenericContestData(contestUrl);
    }

    console.log(`[Contest Extractor] Dados extraídos:`, extractedData);
    return extractedData;

  } catch (error: any) {
    console.error(`[Contest Extractor] Erro ao extrair dados do concurso ${contestId}:`, error.message);
    return {};
  }
}

/**
 * Extractor genérico para bancas sem extractor específico
 */
async function extractGenericContestData(contestUrl: string): Promise<ExtractedContestData> {
  const response = await axios.get(contestUrl, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const $ = cheerio.load(response.data);
  const extractedData: ExtractedContestData = {};

  // Tentar extrair ano da URL ou do conteúdo
  const yearMatch = contestUrl.match(/20\d{2}/) || response.data.match(/20\d{2}/);
  if (yearMatch) {
    extractedData.ano = parseInt(yearMatch[0]);
  }

  // Tentar extrair link do edital
  const editalLinks = $('a[href*="edital"], a[href*=".pdf"], a:contains("Edital")').toArray();
  for (const link of editalLinks) {
    const href = $(link).attr('href');
    if (href && (href.includes('.pdf') || href.includes('edital'))) {
      extractedData.edital_url = href.startsWith('http') ? href : new URL(href, contestUrl).toString();
      break;
    }
  }

  // Tentar extrair salário
  const salarioPatterns = [
    /R\$\s*[\d.,]+/gi,
    /salário.*?R\$\s*[\d.,]+/gi,
    /remuneração.*?R\$\s*[\d.,]+/gi,
  ];
  
  for (const pattern of salarioPatterns) {
    const match = response.data.match(pattern);
    if (match) {
      extractedData.salario = match[0].replace(/.*?(R\$\s*[\d.,]+).*/, '$1');
      break;
    }
  }

  // Tentar extrair número de vagas
  const vagasPatterns = [
    /(\d+)\s*vagas?/gi,
    /vagas?:\s*(\d+)/gi,
  ];
  
  for (const pattern of vagasPatterns) {
    const match = response.data.match(pattern);
    if (match) {
      const num = parseInt(match[0].replace(/\D/g, ''));
      if (num > 0 && num < 10000) {
        extractedData.numero_vagas = num;
        break;
      }
    }
  }

  // Tentar extrair data da prova
  const dataPatterns = [
    /\d{2}\/\d{2}\/20\d{2}/g,
    /\d{2}-\d{2}-20\d{2}/g,
  ];
  
  for (const pattern of dataPatterns) {
    const match = response.data.match(pattern);
    if (match) {
      extractedData.data_prova = match[0];
      break;
    }
  }

  // Tentar extrair nível
  if (response.data.match(/nível\s+superior/gi)) {
    extractedData.nivel = 'superior';
  } else if (response.data.match(/nível\s+médio/gi)) {
    extractedData.nivel = 'médio';
  } else if (response.data.match(/nível\s+fundamental/gi)) {
    extractedData.nivel = 'fundamental';
  }

  // Tentar extrair matérias (procurar por listas)
  const materias: string[] = [];
  $('ul li, ol li').each((_, el) => {
    const text = $(el).text().trim();
    // Filtrar textos que parecem ser matérias (não muito longos, não muito curtos)
    if (text.length > 5 && text.length < 100 && !text.includes('http')) {
      // Verificar se parece ser uma matéria (palavras-chave comuns)
      if (
        text.match(/português|matemática|direito|informática|raciocínio|conhecimentos|legislação/gi) ||
        (text.length < 50 && !text.includes('.'))
      ) {
        materias.push(text);
      }
    }
  });

  if (materias.length > 0 && materias.length < 50) {
    extractedData.materias = materias.slice(0, 30); // Limitar a 30 matérias
  }

  return extractedData;
}

/**
 * Atualiza um concurso com os dados extraídos
 */
export async function updateContestWithExtractedData(
  contestId: string,
  data: ExtractedContestData
): Promise<void> {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.salario) {
      updates.push(`salario = $${idx++}`);
      // Converter para string se for número
      values.push(typeof data.salario === 'number' ? `R$ ${data.salario.toFixed(2)}` : data.salario);
    }
    if (data.numero_vagas) {
      updates.push(`numero_vagas = $${idx++}`);
      values.push(data.numero_vagas);
    }
    if (data.data_prova) {
      updates.push(`data_prova = $${idx++}`);
      values.push(data.data_prova);
    }
    if (data.orgao) {
      updates.push(`orgao = $${idx++}`);
      values.push(data.orgao);
    }
    if (data.cidade) {
      updates.push(`cidade = $${idx++}`);
      values.push(data.cidade);
    }
    if (data.estado) {
      updates.push(`estado = $${idx++}`);
      values.push(data.estado);
    }
    if (data.nivel) {
      updates.push(`nivel = $${idx++}`);
      values.push(data.nivel);
    }
    if (data.ano) {
      updates.push(`ano = $${idx++}`);
      values.push(data.ano);
    }
    if (data.edital_url) {
      updates.push(`edital_url = $${idx++}`);
      values.push(data.edital_url);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(contestId);

      await pool.query(
        `UPDATE concursos SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
      );

      console.log(`[Contest Extractor] Concurso ${contestId} atualizado com sucesso`);
    }

    // Salvar matérias se encontradas
    if (data.materias && data.materias.length > 0) {
      for (const materia of data.materias) {
        try {
          await pool.query(
            'INSERT INTO materias (contest_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [contestId, materia]
          );
        } catch (err) {
          console.error(`[Contest Extractor] Erro ao salvar matéria "${materia}":`, err);
        }
      }
      console.log(`[Contest Extractor] ${data.materias.length} matérias salvas para concurso ${contestId}`);
    }

  } catch (error) {
    console.error(`[Contest Extractor] Erro ao atualizar concurso ${contestId}:`, error);
    throw error;
  }
}

/**
 * Processa um concurso: extrai dados e atualiza no banco
 */
export async function processContest(contestId: string): Promise<boolean> {
  try {
    // Buscar URL do concurso e banca
    const { rows } = await pool.query(
      `SELECT c.contest_url, b.name as banca_slug 
       FROM concursos c 
       LEFT JOIN bancas b ON c.banca_id = b.id 
       WHERE c.id = $1`,
      [contestId]
    );

    if (rows.length === 0 || !rows[0].contest_url) {
      console.log(`[Contest Extractor] Concurso ${contestId} não tem URL`);
      return false;
    }

    const contestUrl = rows[0].contest_url;
    const bancaSlug = rows[0].banca_slug;

    // Extrair dados
    const extractedData = await extractContestData(contestId, contestUrl, bancaSlug);

    // Atualizar no banco
    await updateContestWithExtractedData(contestId, extractedData);

    return true;
  } catch (error) {
    console.error(`[Contest Extractor] Erro ao processar concurso ${contestId}:`, error);
    return false;
  }
}
