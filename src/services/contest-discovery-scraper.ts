import axios from 'axios';
import * as cheerio from 'cheerio';
import { pool } from '../db/connection.js';
import { scrapeBancaContestsWithPuppeteer } from './puppeteer-scraper.js';

/**
 * Interface para um concurso descoberto
 */
interface DiscoveredContest {
  nome: string;
  dou_url: string;
  banca_id: number;
}

/**
 * Mapeamento de URLs de busca de concursos por banca
 */
const BANCA_CONTEST_URLS: Record<string, string> = {
  'cebraspe': 'https://www.cebraspe.org.br/concursos',
  'fcc': 'https://www.concursosfcc.com.br/concursos',
  'fgv': 'https://conhecimento.fgv.br/concursos',
  'vunesp': 'https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas',
  'cesgranrio': 'https://www.cesgranrio.org.br/concursos/',
  'quadrix': 'https://www.quadrix.org.br/concursos.aspx',
  'ibfc': 'https://www.ibfc.org.br/concursos-abertos',
  'aocp': 'https://www.institutoaocp.org.br/concursos',
};

/**
 * Busca concursos no site de uma banca específica
 */
export async function scrapeBancaContests(bancaId: number): Promise<DiscoveredContest[]> {
  try {
    // Buscar informações da banca
    const { rows: [banca] } = await pool.query(
      'SELECT id, name, website_url FROM bancas WHERE id = $1',
      [bancaId]
    );

    if (!banca) {
      throw new Error(`Banca ${bancaId} não encontrada`);
    }

    console.log(`[Contest Discovery] Buscando concursos da banca: ${banca.name}`);

    // Verificar se temos URL de concursos mapeada
    const contestUrl = BANCA_CONTEST_URLS[banca.name.toLowerCase()] || banca.website_url;
    
    if (!contestUrl) {
      console.log(`[Contest Discovery] Sem URL de concursos para ${banca.name}`);
      return [];
    }

    // Bancas que requerem Puppeteer (bloqueiam HTTP normal)
    const puppeteerBancas = ['cesgranrio', 'ibfc', 'aocp'];
    
    if (puppeteerBancas.includes(banca.name.toLowerCase())) {
      console.log(`[Contest Discovery] Usando Puppeteer para ${banca.name}`);
      return await scrapeBancaContestsWithPuppeteer(bancaId, banca.name, contestUrl);
    }

    // Fazer requisição HTTP normal
    const response = await axios.get(contestUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Parse HTML com Cheerio
    const $ = cheerio.load(response.data);
    const contests: DiscoveredContest[] = [];

    // Seletores específicos por banca
    const bancaSelectors: Record<string, string[]> = {
      'cebraspe': [
        'a[href*="/concursos/"]',
        '.q_circle_text_holder a',
        'a.icon_with_title_link',
      ],
      'quadrix': [
        'a[href*="todos-os-concursos"]',
        '.exam-card a',
        'a[href*=".aspx"]',
      ],
      'vunesp': [
        'a[href*="concurso"]',
        '.card a',
        'a[href*="vunesp.com.br"]',
      ],
    };

    // Usar seletores específicos da banca ou genéricos
    const selectors = bancaSelectors[banca.name.toLowerCase()] || [
      'a[href*="concurso"]',
      'a[href*="edital"]',
      'a[href*="dou"]',
      '.concurso a',
      '.edital a',
      'table a',
    ];

    console.log(`[Contest Discovery] Usando seletores: ${selectors.join(', ')}`);
    
    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && text && text.length > 10) {
          // Construir URL completa
          let fullUrl = href;
          if (!href.startsWith('http')) {
            const baseUrl = new URL(contestUrl);
            fullUrl = new URL(href, baseUrl.origin).toString();
          }

          // Verificar se parece ser um link de concurso/edital
          if (
            fullUrl.includes('dou.') ||
            fullUrl.includes('edital') ||
            fullUrl.includes('concurso') ||
            fullUrl.includes('.pdf')
          ) {
            contests.push({
              nome: text.substring(0, 255), // Limitar tamanho
              dou_url: fullUrl,
              banca_id: bancaId,
            });
          }
        }
      });

      // Se encontrou concursos, parar
      if (contests.length > 0) {
        console.log(`[Contest Discovery] Seletor bem-sucedido: ${selector}`);
        break;
      }
    }
    
    // Log se nenhum concurso foi encontrado
    if (contests.length === 0) {
      console.log(`[Contest Discovery] Nenhum concurso encontrado com os seletores fornecidos`);
    }

    console.log(`[Contest Discovery] Encontrados ${contests.length} concursos para ${banca.name}`);
    return contests;

  } catch (error: any) {
    const errorMessage = error.response?.status 
      ? `HTTP ${error.response.status} - ${error.response.statusText}`
      : error.message || 'Erro desconhecido';
    
    console.error(`[Contest Discovery] Erro ao buscar concursos da banca ${bancaId}: ${errorMessage}`);
    
    // Log adicional para erros HTTP
    if (error.response) {
      console.error(`[Contest Discovery] Status: ${error.response.status}`);
      console.error(`[Contest Discovery] URL: ${error.config?.url}`);
    }
    
    return [];
  }
}

/**
 * Salva concursos descobertos no banco de dados
 */
export async function saveDiscoveredContests(contests: DiscoveredContest[]): Promise<number> {
  let savedCount = 0;

  for (const contest of contests) {
    try {
      // Verificar se já existe
      const { rows: existing } = await pool.query(
        'SELECT id FROM concursos WHERE dou_url = $1',
        [contest.dou_url]
      );

      if (existing.length > 0) {
        console.log(`[Contest Discovery] Concurso já existe: ${contest.nome}`);
        continue;
      }

      // Inserir novo concurso
      await pool.query(
        'INSERT INTO concursos (nome, dou_url, banca_id) VALUES ($1, $2, $3)',
        [contest.nome, contest.dou_url, contest.banca_id]
      );

      savedCount++;
      console.log(`[Contest Discovery] Concurso salvo: ${contest.nome}`);

    } catch (error) {
      console.error(`[Contest Discovery] Erro ao salvar concurso ${contest.nome}:`, error);
    }
  }

  return savedCount;
}

/**
 * Atualiza contador de concursos de uma banca
 */
export async function updateBancaContestCount(bancaId: number): Promise<void> {
  try {
    await pool.query(`
      UPDATE bancas 
      SET total_contests = (
        SELECT COUNT(*) FROM concursos WHERE banca_id = $1
      )
      WHERE id = $1
    `, [bancaId]);
  } catch (error) {
    console.error(`[Contest Discovery] Erro ao atualizar contador da banca ${bancaId}:`, error);
  }
}

/**
 * Executa descoberta de concursos para todas as bancas ativas
 */
export async function scrapeAllBancasContests(): Promise<{ total: number; saved: number }> {
  try {
    // Buscar todas as bancas ativas
    const { rows: bancas } = await pool.query(
      'SELECT id, name FROM bancas WHERE is_active = true ORDER BY id'
    );

    console.log(`[Contest Discovery] Iniciando scraping de ${bancas.length} bancas...`);

    let totalFound = 0;
    let totalSaved = 0;

    for (const banca of bancas) {
      console.log(`[Contest Discovery] Processando banca: ${banca.name} (ID: ${banca.id})`);
      
      const contests = await scrapeBancaContests(banca.id);
      totalFound += contests.length;

      if (contests.length > 0) {
        const saved = await saveDiscoveredContests(contests);
        totalSaved += saved;

        // Atualizar contador
        await updateBancaContestCount(banca.id);
      }

      // Delay entre bancas para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[Contest Discovery] Scraping concluído! Total encontrado: ${totalFound}, Salvos: ${totalSaved}`);

    return { total: totalFound, saved: totalSaved };

  } catch (error) {
    console.error('[Contest Discovery] Erro ao executar scraping de todas as bancas:', error);
    throw error;
  }
}
