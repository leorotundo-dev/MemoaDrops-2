import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FgvConcursoData {
  status?: string;
  telefone?: string;
  email_contato?: string;
  descricao?: string;
  edital_url?: string;
  cargos?: string[];
}

/**
 * Extrai dados estruturados de um concurso da FGV
 * Nota: FGV não disponibiliza dados estruturados (salário, vagas, etc) na página HTML
 * Esses dados precisam ser extraídos do PDF do edital usando GPT-4
 */
export async function extractFgvConcursoData(url: string): Promise<FgvConcursoData> {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const result: FgvConcursoData = {};

    // Extrair status
    const status = $('.badge, .status').first().text().trim();
    if (status) {
      result.status = status;
    }

    // Extrair telefone
    const telefoneMatch = $('body').text().match(/(\d{4}\s*\d{7})/);
    if (telefoneMatch) {
      result.telefone = telefoneMatch[1].replace(/\s/g, '');
    }

    // Extrair email
    const emailMatch = $('body').text().match(/([a-zA-Z0-9._-]+@fgv\.br)/);
    if (emailMatch) {
      result.email_contato = emailMatch[1];
    }

    // Extrair descrição
    const descricao = $('p').first().text().trim();
    if (descricao && descricao.length > 50) {
      result.descricao = descricao.substring(0, 500);
    }

    // Extrair cargos mencionados
    const cargos: string[] = [];
    const cargoMatches = descricao.match(/cargo de ([^.]+)/gi);
    if (cargoMatches) {
      cargoMatches.forEach(match => {
        const cargo = match.replace(/cargo de /i, '').trim();
        if (cargo && !cargos.includes(cargo)) {
          cargos.push(cargo);
        }
      });
    }
    if (cargos.length > 0) {
      result.cargos = cargos;
    }

    // Extrair link do edital
    const editalLink = $('a:contains("Edital")').first().attr('href');
    if (editalLink) {
      result.edital_url = editalLink.startsWith('http') 
        ? editalLink 
        : `https://conhecimento.fgv.br${editalLink}`;
    }

    return result;

  } catch (error) {
    console.error('[FGV Extractor] Erro ao extrair dados:', error);
    return {};
  }
}
