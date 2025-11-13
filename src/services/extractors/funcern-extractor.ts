import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FuncernConcursoData {
  edital_numero?: string;
  data_publicacao?: string;
  descricao?: string;
  edital_url?: string;
  email_contato?: string;
}

/**
 * Extrai dados estruturados de um concurso da FUNCERN
 * Nota: FUNCERN não disponibiliza dados estruturados (salário, vagas, etc) na página HTML
 * Esses dados precisam ser extraídos do PDF do edital usando GPT-4
 */
export async function extractFuncernConcursoData(url: string): Promise<FuncernConcursoData> {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const result: FuncernConcursoData = {};

    // Extrair número do edital
    const editalText = $('body').text();
    const editalMatch = editalText.match(/EDITAL\s*n[ºo°]?\s*\.?\s*(\d+\/\d+)/i);
    if (editalMatch) {
      result.edital_numero = editalMatch[1];
    }

    // Extrair data de publicação
    const dataMatch = editalText.match(/(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i);
    if (dataMatch) {
      result.data_publicacao = dataMatch[1];
    }

    // Extrair descrição (primeiro parágrafo após o título)
    const descricao = $('p').first().text().trim();
    if (descricao && descricao.length > 50) {
      result.descricao = descricao.substring(0, 500);
    }

    // Extrair link do edital de abertura
    const editalLink = $('a:contains("Edital de Abertura"), a:contains("Edital De Abertura")').first().attr('href');
    if (editalLink) {
      result.edital_url = editalLink.startsWith('http') 
        ? editalLink 
        : `https://funcern.br${editalLink}`;
    }

    // Extrair email de contato
    const emailMatch = editalText.match(/([a-zA-Z0-9._-]+@funcern\.br)/);
    if (emailMatch) {
      result.email_contato = emailMatch[1];
    }

    return result;

  } catch (error) {
    console.error('[FUNCERN Extractor] Erro ao extrair dados:', error);
    return {};
  }
}
