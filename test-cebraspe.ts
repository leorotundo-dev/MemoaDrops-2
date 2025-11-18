// Test Cebraspe scraper
import { runScraperForBank } from './src/services/scraper-monolith-v2.js';
import fs from 'fs';

async function testCebraspe() {
  console.log('🔍 Testando scraper Cebraspe...\n');
  
  try {
    const results = await runScraperForBank('cebraspe');
    
    const outputFile = '/home/ubuntu/cebraspe-results.json';
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    
    console.log(`\n✅ Scraper executado com sucesso!`);
    console.log(`⏱️  Resultados: ${results.length}`);
    console.log(`💾 Salvos em: ${outputFile}\n`);
    
    console.log('📋 Resumo dos resultados:');
    results.forEach((r: any, i: number) => {
      console.log(`${i + 1}. ${r.concurso.titulo}`);
      console.log(`   URL: ${r.concurso.url}`);
      console.log(`   Edital: ${r.edital.titulo}`);
      console.log(`   Tipo PDF: ${r.pdf.tipo}`);
      console.log(`   Disciplinas: ${r.dados.disciplinas?.length || 0}\n`);
    });
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

testCebraspe();
