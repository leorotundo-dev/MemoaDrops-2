import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CopeveConcursoData {
  salario?: number;
  numero_vagas?: number;
  data_prova?: string;
  inicio_inscricoes?: string;
  fim_inscricoes?: string;
  taxa_inscricao?: number;
  escolaridade?: string;
  detalhes?: string;
  edital_url?: string;
}

/**
 * Extrai dados estruturados de um concurso da COPEVE UFAL
 */
export async function extractCopeveConcursoData(url: string): Promise<CopeveConcursoData> {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const result: CopeveConcursoData = {};

    // Extrair informações da tabela principal
    $('table tr').each((_, row) => {
      const $row = $(row);
      const text = $row.text();

      // Remuneração
      if (text.includes('Remuneração:')) {
        const match = text.match(/R\$\s*([\d.,]+)/);
        if (match) {
          result.salario = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
      }

      // Vagas
      if (text.includes('Vagas:')) {
        const match = text.match(/Vagas:\s*(\d+)/);
        if (match) {
          result.numero_vagas = parseInt(match[1]);
        }
      }

      // Taxa de Inscrição
      if (text.includes('Taxa de Inscrição:')) {
        const match = text.match(/R\$\s*([\d.,]+)/);
        if (match) {
          result.taxa_inscricao = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
      }

      // Escolaridade
      if (text.includes('Escolaridade:')) {
        const match = text.match(/Escolaridade:\s*(.+)/);
        if (match) {
          result.escolaridade = match[1].trim();
        }
      }

      // Data das Provas
      if (text.includes('Data das Provas:')) {
        const match = text.match(/Data das Provas:\s*(.+)/);
        if (match && match[1].trim()) {
          result.data_prova = match[1].trim();
        }
      }

      // Início das Inscrições
      if (text.includes('Início das Inscrições:')) {
        const match = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (match) {
          result.inicio_inscricoes = match[1];
        }
      }

      // Fim das Inscrições
      if (text.includes('Fim das Inscrições:')) {
        const match = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (match) {
          result.fim_inscricoes = match[1];
        }
      }
    });

    // Extrair detalhes
    const detalhes = $('table tr td:contains("Detalhes:")').next().text().trim();
    if (detalhes) {
      result.detalhes = detalhes;
    }

    // Extrair link do edital
    const editalLink = $('a:contains("Edital De Abertura")').attr('href');
    if (editalLink) {
      result.edital_url = editalLink.startsWith('http') 
        ? editalLink 
        : `https://copeve.ufal.br/${editalLink}`;
    }

    return result;

  } catch (error) {
    console.error('[COPEVE Extractor] Erro ao extrair dados:', error);
    return {};
  }
}
