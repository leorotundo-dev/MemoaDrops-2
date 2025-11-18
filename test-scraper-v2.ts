// Test scraper v2
import { runFullPipeline } from './src/services/scraper-monolith-v2.js';
import fs from 'fs';

async function testScraper() {
  console.log('🧪 Testando scraper FGV v2 (com pdfjs-dist)...\n');
  
  try {
    const startTime = Date.now();
    const resultados = await runFullPipeline('fgv');
    const tempoTotal = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(`\n✅ Scraper executado com sucesso!`);
    console.log(`⏱️  Tempo total: ${tempoTotal}s`);
    console.log(`📊 Resultados encontrados: ${resultados.length}\n`);
    
    // Salvar resultados
    const outputFile = '/home/ubuntu/scraper-v2-results.json';
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
        
        // Mostrar primeira disciplina como exemplo
        const primeiraDisc = disciplinas[0];
        console.log(`   Exemplo: ${primeiraDisc.nome}`);
        if (primeiraDisc.topicos && primeiraDisc.topicos.length > 0) {
          console.log(`      - ${primeiraDisc.topicos[0].nome}`);
        }
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
