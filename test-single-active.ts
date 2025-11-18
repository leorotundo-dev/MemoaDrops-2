// Test with specific active concurso
import { BaseScraper, BANKS_CONFIG, processPdf, downloadPdf, readPdfText, extractWithOpenAI, isConcursoActive } from './src/services/scraper-monolith-v2.js';
import fs from 'fs';

async function testSingleActive() {
  console.log('🔍 Testando concurso ativo específico...\n');
  
  try {
    const cfg = BANKS_CONFIG['fgv'];
    const scraper = new BaseScraper(cfg);
    
    // Testar com: Prefeitura Municipal de Abreu e Lima (sabemos que está ativo)
    const concursoUrl = 'https://conhecimento.fgv.br/concursos/prefabreuelima24';
    
    console.log(`📄 Processando: ${concursoUrl}\n`);
    
    // Verificar se está ativo
    const htmlConcurso = await scraper.fetchHtml(concursoUrl);
    const isAtivo = isConcursoActive(htmlConcurso);
    console.log(`Status: ${isAtivo ? '✅ ATIVO' : '❌ INATIVO'}\n`);
    
    if (!isAtivo) {
      console.log('Concurso não está ativo, abortando teste.');
      return;
    }
    
    // Extrair editais
    const editais = scraper.extractEditaisFromHtml(htmlConcurso, concursoUrl);
    console.log(`Editais encontrados: ${editais.length}\n`);
    editais.forEach((e, i) => {
      console.log(`${i + 1}. ${e.titulo}`);
      console.log(`   URL: ${e.url}\n`);
    });
    
    if (editais.length === 0) {
      console.log('❌ Nenhum edital válido encontrado');
      return;
    }
    
    // Processar primeiro edital
    const edital = editais[0];
    console.log(`\n🔄 Processando: ${edital.titulo}...\n`);
    
    try {
      // Baixar e classificar PDF
      console.log('1. Baixando e classificando PDF...');
      const pdfInfo = await processPdf(edital.url);
      console.log(`   Tipo: ${pdfInfo.tipo}`);
      console.log(`   Hash: ${pdfInfo.hash}\n`);
      
      if (pdfInfo.tipo !== 'edital_de_abertura') {
        console.log(`⚠️  PDF não é edital de abertura (é ${pdfInfo.tipo}), pulando...`);
        return;
      }
      
      // Extrair texto completo
      console.log('2. Extraindo texto completo...');
      const buf = await downloadPdf(edital.url);
      const fullText = await readPdfText(buf, 6);
      console.log(`   ✅ ${fullText.length} caracteres extraídos\n`);
      
      // Extrair dados com IA
      console.log('3. Extraindo dados com OpenAI...');
      const dados = await extractWithOpenAI(fullText);
      console.log('   ✅ Dados extraídos!\n');
      
      // Salvar resultado
      const resultado = {
        banca: cfg.name,
        concurso: { titulo: 'Prefeitura de Abreu e Lima', url: concursoUrl },
        edital,
        pdf: { tipo: pdfInfo.tipo, hash: pdfInfo.hash },
        dados
      };
      
      const outputFile = '/home/ubuntu/single-active-result.json';
      fs.writeFileSync(outputFile, JSON.stringify(resultado, null, 2));
      
      console.log(`💾 Resultado salvo em: ${outputFile}\n`);
      console.log('📊 Resumo dos dados extraídos:');
      console.log(`   Órgão: ${dados.orgao || 'N/A'}`);
      console.log(`   Cargos: ${dados.cargos?.length || 0}`);
      console.log(`   Disciplinas: ${dados.disciplinas?.length || 0}`);
      
      if (dados.disciplinas && dados.disciplinas.length > 0) {
        console.log('\n📚 Disciplinas encontradas:');
        dados.disciplinas.slice(0, 5).forEach((d: any, i: number) => {
          console.log(`   ${i + 1}. ${d.nome}`);
          if (d.topicos && d.topicos.length > 0) {
            console.log(`      Tópicos: ${d.topicos.length}`);
            d.topicos.slice(0, 2).forEach((t: any) => {
              console.log(`         - ${t.nome || t}`);
            });
          }
        });
      }
      
    } catch (pdfError: any) {
      console.error(`❌ Erro ao processar PDF: ${pdfError.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

testSingleActive();
