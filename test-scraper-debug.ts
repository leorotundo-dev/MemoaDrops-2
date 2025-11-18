// Test scraper with debug
import { BaseScraper, BANKS_CONFIG, isConcursoActive } from './src/services/scraper-monolith.js';

async function testScraperDebug() {
  console.log('🔍 Testando scraper FGV com debug...\n');
  
  try {
    const cfg = BANKS_CONFIG['fgv'];
    const scraper = new BaseScraper(cfg);
    
    // Passo 1: Buscar lista de concursos
    console.log('1️⃣ Buscando lista de concursos...');
    const concursosComEditais = await scraper.runConcursoList();
    console.log(`   Encontrados: ${concursosComEditais.length} concursos\n`);
    
    // Mostrar primeiros 5
    concursosComEditais.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.concurso.titulo}`);
      console.log(`      URL: ${item.concurso.url}`);
      console.log(`      Editais: ${item.editais.length}`);
      item.editais.slice(0, 2).forEach(e => {
        console.log(`         - ${e.titulo}`);
      });
      console.log('');
    });
    
    // Passo 2: Verificar concursos ativos
    console.log('2️⃣ Verificando concursos ativos...');
    let ativos = 0;
    for (const item of concursosComEditais.slice(0, 10)) {
      const htmlConcurso = await scraper.fetchHtml(item.concurso.url);
      const isAtivo = isConcursoActive(htmlConcurso);
      if (isAtivo) {
        ativos++;
        console.log(`   ✅ ATIVO: ${item.concurso.titulo}`);
      } else {
        console.log(`   ❌ INATIVO: ${item.concurso.titulo}`);
      }
    }
    console.log(`\n   Total ativos (primeiros 10): ${ativos}\n`);
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

testScraperDebug();
