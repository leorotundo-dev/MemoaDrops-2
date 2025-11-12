import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Script para testar scrapers de descoberta de concursos
 * Testa cada banca individualmente e relata os resultados
 */

const BANCA_CONTEST_URLS: Record<string, string> = {
  'cebraspe': 'https://www.cebraspe.org.br/concursos',
  'fcc': 'https://www.concursosfcc.com.br/concursos',
  'fgv': 'https://conhecimento.fgv.br/concursos',
  'vunesp': 'https://www.vunesp.com.br/VUNESP/concursos.html',
  'cesgranrio': 'https://www.cesgranrio.org.br/concursos/',
  'quadrix': 'https://www.quadrix.org.br/concursos.aspx',
  'ibfc': 'https://www.ibfc.org.br/concursos-abertos',
  'aocp': 'https://www.institutoaocp.org.br/concursos',
};

interface TestResult {
  banca: string;
  url: string;
  status: 'success' | 'error' | 'no_contests';
  contestsFound: number;
  error?: string;
  sampleLinks?: string[];
}

async function testBancaScraper(bancaName: string, url: string): Promise<TestResult> {
  try {
    console.log(`\n🔍 Testando ${bancaName}...`);
    console.log(`   URL: ${url}`);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      validateStatus: () => true, // Aceita qualquer status
    });

    if (response.status !== 200) {
      return {
        banca: bancaName,
        url,
        status: 'error',
        contestsFound: 0,
        error: `HTTP ${response.status}`,
      };
    }

    const $ = cheerio.load(response.data);
    const links = new Set<string>();

    // Seletores genéricos
    const selectors = [
      'a[href*="concurso"]',
      'a[href*="edital"]',
      'a[href*="dou"]',
      '.concurso a',
      '.edital a',
      'table a',
    ];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.length > 5) {
          links.add(href);
        }
      });
    }

    const sampleLinks = Array.from(links).slice(0, 5);

    if (links.size === 0) {
      return {
        banca: bancaName,
        url,
        status: 'no_contests',
        contestsFound: 0,
      };
    }

    return {
      banca: bancaName,
      url,
      status: 'success',
      contestsFound: links.size,
      sampleLinks,
    };
  } catch (error: any) {
    return {
      banca: bancaName,
      url,
      status: 'error',
      contestsFound: 0,
      error: error.message || 'Erro desconhecido',
    };
  }
}

async function main() {
  console.log('🚀 Iniciando testes dos scrapers de descoberta...\n');
  console.log('=' .repeat(60));

  const results: TestResult[] = [];

  for (const [bancaName, url] of Object.entries(BANCA_CONTEST_URLS)) {
    const result = await testBancaScraper(bancaName, url);
    results.push(result);

    // Exibir resultado imediatamente
    if (result.status === 'success') {
      console.log(`   ✅ ${result.contestsFound} links encontrados`);
      if (result.sampleLinks && result.sampleLinks.length > 0) {
        console.log(`   📄 Exemplos:`);
        result.sampleLinks.forEach(link => console.log(`      - ${link.substring(0, 80)}...`));
      }
    } else if (result.status === 'no_contests') {
      console.log(`   ⚠️  Nenhum link encontrado`);
    } else {
      console.log(`   ❌ Erro: ${result.error}`);
    }

    // Delay para não sobrecarregar os sites
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO DOS TESTES:\n');

  const successful = results.filter(r => r.status === 'success');
  const noContests = results.filter(r => r.status === 'no_contests');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ Sucesso: ${successful.length} bancas`);
  successful.forEach(r => console.log(`   - ${r.banca}: ${r.contestsFound} links`));

  console.log(`\n⚠️  Sem concursos: ${noContests.length} bancas`);
  noContests.forEach(r => console.log(`   - ${r.banca}`));

  console.log(`\n❌ Erros: ${errors.length} bancas`);
  errors.forEach(r => console.log(`   - ${r.banca}: ${r.error}`));

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
