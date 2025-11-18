// Test scraper locally
import { runFullPipeline } from './src/services/scraper-monolith.js';
import fs from 'fs';

async function testScraper() {
  console.log('🧪 Testando scraper FGV localmente...\n');
  
  try {
    const startTime = Date.now();
    const resultados = await runFullPipeline('fgv');
    const tempoTotal = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(`\n✅ Scraper executado com sucesso!`);
    console.log(`⏱️  Tempo total: ${tempoTotal}s`);
    console.log(`📊 Resultados encontrados: ${resultados.length}\n`);
    
    // Salvar resultados em arquivo
    const outputFile = '/home/ubuntu/scraper-results.json';
    fs.writeFileSync(outputFile, JSON.stringify(resultados, null, 2));
    console.log(`💾 Resultados salvos em: ${outputFile}\n`);
    
    // Mostrar resumo
    console.log('📋 Resumo dos resultados:\n');
    resultados.forEach((r, i) => {
      console.log(`${i + 1}. ${r.concurso.titulo}`);
      console.log(`   URL: ${r.concurso.url}`);
      console.log(`   Edital: ${r.edital.titulo}`);
      console.log(`   Tipo PDF: ${r.pdf.tipo}`);
      
      const disciplinas = r.dados?.disciplinas || [];
      console.log(`   Disciplinas: ${disciplinas.length}`);
      
      if (disciplinas.length > 0) {
        const totalTopicos = disciplinas.reduce((sum: number, d: any) => sum + (d.topicos?.length || 0), 0);
        console.log(`   Tópicos: ${totalTopicos}`);
      }
      console.log('');
    });
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testScraper();
