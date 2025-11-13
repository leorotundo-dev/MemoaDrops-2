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
  contest_url?: string;
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
  'quadrix': 'https://site.quadrix.org.br/',
  'ibfc': 'https://www.ibfc.org.br/concursos-abertos',
  'aocp': 'https://www.institutoaocp.org.br/concursos',
  // Novas bancas
  'iades': 'https://www.iades.com.br/inscricao/?v=andamento',
  // Bancas fáceis - Lote 2
  'objetiva': 'https://concursos.objetivas.com.br/index/abertos/',
  'fadesp': 'https://portalfadesp.org.br/?page_id=33858',
  'cetro': 'https://www.cetapnet.com.br/index/1/',
  'funcern': 'https://funcern.br/concursos/',
  'copeve_ufal': 'https://copeve.ufal.br/index.php?opcao=todosConcursos',
  'fumarc': 'https://www.fumarc.com.br/concursos',
  'instituto_mais': 'https://www.institutomais.org.br/Concursos/ConcursosAbertos',
  'ufpr': 'https://servicos.nc.ufpr.br/PortalNC/ConcursosAndamento?ano=2025',
  'fundatec': 'https://www.fundatec.org.br/portal/concursos/concursos_abertos.php',
  'ibade': 'https://portal.ibade.selecao.site/edital',
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

    // Bancas que requerem Puppeteer (bloqueiam HTTP normal ou usam JavaScript dinâmico)
    const puppeteerBancas = ['cesgranrio', 'ibfc', 'aocp', 'vunesp', 'cebraspe'];
    
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
        'a.icon_with_title_link',
        'a[href*="/concursos/"]',
        '.q_circle_text_holder a',
      ],
      'quadrix': [
        'a[href*="inscricoes-abertas"]',
        '.card a',
        'a:contains("VISUALIZAR")',
        'a[href*="concurso"]',
      ],
      'vunesp': [
        'a[href*="concurso"]',
        '.card a',
        'a[href*="vunesp.com.br"]',
      ],
      'iades': [
        'a[href*="iades.com.br"]',
        '.concurso a',
        'a:contains("MAIS INFORMAÇÕES")',
      ],
      'fundatec': [
        'a[href*="concurso"]',
        'a[href*="edital"]',
      ],
      'ibade': [
        'a[href*="Inscrições Abertas"]',
        'a[href*="edital"]',
      ],
      'objetiva': [
        'h3 a',
        'a[href*="concurso"]',
      ],
      'fadesp': [
        '.elementor-widget-container ul li a',
        'a[href*="concurso"]',
      ],
      'cetro': [
        '.concurso-item h3 a',
        'a[href*="concurso"]',
      ],
      'funcern': [
        'div.entry-content a',
        'a[href*="concurso"]',
      ],
      'copeve_ufal': [
        'table a',
        'a[href*="concurso"]',
      ],
      'fumarc': [
        'div.col-md-4 a',
        'a[href*="Edital"]',
      ],
      'instituto_mais': [
        'div.col-md-12 a',
        'a[href*="concurso"]',
      ],
      'ufpr': [
        'div.col-md-3 a',
        'a[href*="concurso"]',
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

          // Excluir link da própria página de concursos
          if (fullUrl === contestUrl || fullUrl === contestUrl + '/') {
            return;
          }

          // Verificar se parece ser um link de concurso/edital
          if (
            fullUrl.includes('dou.') ||
            fullUrl.includes('edital') ||
            fullUrl.includes('concurso') ||
            fullUrl.includes('.pdf') ||
            fullUrl.includes('/concursos/') || // CEBRASPE
            fullUrl.includes('/todos-os-concursos/') // QUADRIX
          ) {
            contests.push({
              nome: text.substring(0, 255), // Limitar tamanho
              dou_url: fullUrl,
              contest_url: fullUrl, // URL do concurso
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
      // Verificar se já existe (por nome e banca)
      const { rows: existing } = await pool.query(
        'SELECT id FROM concursos WHERE name = $1 AND banca_id = $2',
        [contest.nome, contest.banca_id]
      );

      if (existing.length > 0) {
        console.log(`[Contest Discovery] Concurso já existe: ${contest.nome}`);
        continue;
      }

      // Inserir novo concurso com schema novo
      // Gerar slug a partir do nome
      const slug = contest.nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
        .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
      
      await pool.query(
        'INSERT INTO concursos (name, slug, banca_id, contest_url, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [contest.nome, slug, contest.banca_id, contest.contest_url || contest.dou_url]
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
