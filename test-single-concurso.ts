// Test single concurso
import { BaseScraper, BANKS_CONFIG, processPdf, downloadPdf, readPdfText, extractWithOpenAI } from './src/services/scraper-monolith.js';
import fs from 'fs';

async function testSingleConcurso() {
  console.log('🔍 Testando processamento de um concurso específico...\n');
  
  try {
    const cfg = BANKS_CONFIG['fgv'];
    const scraper = new BaseScraper(cfg);
    
    // Testar com: Prefeitura Municipal de Abreu e Lima
    const concursoUrl = 'https://conhecimento.fgv.br/concursos/prefabreuelima24';
    
    console.log(`📄 Buscando editais de: ${concursoUrl}\n`);
    const htmlConcurso = await scraper.fetchHtml(concursoUrl);
    const editais = scraper.extractEditaisFromHtml(htmlConcurso, concursoUrl);
    
    console.log(`Editais encontrados: ${editais.length}\n`);
    editais.forEach((e, i) => {
      console.log(`${i + 1}. ${e.titulo}`);
      console.log(`   URL: ${e.url}\n`);
    });
    
    if (editais.length === 0) {
      console.log('❌ Nenhum edital encontrado');
      return;
    }
    
    // Tentar processar o primeiro edital
    const edital = editais[0];
    console.log(`\n🔄 Processando: ${edital.titulo}...\n`);
    
    try {
      // Baixar PDF
      console.log('1. Baixando PDF...');
      const buf = await downloadPdf(edital.url);
      console.log(`   ✅ PDF baixado: ${buf.length} bytes\n`);
      
      // Ler texto
      console.log('2. Extraindo texto do PDF...');
      const text = await readPdfText(buf, 6);
      console.log(`   ✅ Texto extraído: ${text.length} caracteres\n`);
      console.log('   Preview:');
      console.log('   ' + text.slice(0, 500).replace(/\n/g, '\n   ') + '...\n');
      
      // Extrair dados com IA
      console.log('3. Extraindo dados com OpenAI...');
      const dados = await extractWithOpenAI(text);
      console.log('   ✅ Dados extraídos!\n');
      
      // Salvar resultado
      const outputFile = '/home/ubuntu/single-concurso-result.json';
      fs.writeFileSync(outputFile, JSON.stringify({
        concurso: { titulo: 'Prefeitura de Abreu e Lima', url: concursoUrl },
        edital,
        dados
      }, null, 2));
      
      console.log(`💾 Resultado salvo em: ${outputFile}\n`);
      console.log('📊 Dados extraídos:');
      console.log(JSON.stringify(dados, null, 2));
      
    } catch (pdfError: any) {
      console.error(`❌ Erro ao processar PDF: ${pdfError.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

testSingleConcurso();
