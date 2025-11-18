// Testar todas as 10 bancas e gerar relatório
import { runFullPipeline } from './src/services/scraper-monolith-v2.js';
import fs from 'fs';

const BANCAS = [
  'fgv',
  'cebraspe',
  'fcc',
  'vunesp',
  'quadrix',
  'aocp',
  'ibfc',
  'iades',
  'fundatec',
  'idecan'
];

interface BancaResult {
  banca: string;
  status: 'success' | 'error';
  concursos_encontrados: number;
  com_conteudo_programatico: number;
  tempo_ms: number;
  erro?: string;
  amostra?: any;
}

async function testAllBancas() {
  console.log('🔍 Testando todas as 10 bancas...\n');
  console.log('⚠️  Isso pode levar 10-30 minutos!\n');
  
  const results: BancaResult[] = [];
  
  for (const banca of BANCAS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Testando: ${banca.toUpperCase()}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    try {
      const data = await runFullPipeline(banca);
      const tempo_ms = Date.now() - startTime;
      
      const comConteudo = data.filter((d: any) => 
        d.dados?.disciplinas?.length > 0 || 
        d.dados?.conteúdo_programático?.length > 0 ||
        d.dados?.topicos_conteudo_programatico?.length > 0
      );
      
      const result: BancaResult = {
        banca,
        status: 'success',
        concursos_encontrados: data.length,
        com_conteudo_programatico: comConteudo.length,
        tempo_ms,
        amostra: comConteudo[0] || data[0]
      };
      
      results.push(result);
      
      console.log(`✅ Concluído em ${(tempo_ms / 1000).toFixed(1)}s`);
      console.log(`   Concursos encontrados: ${data.length}`);
      console.log(`   Com conteúdo programático: ${comConteudo.length}`);
      
      if (comConteudo.length > 0) {
        console.log(`   🎯 BANCA COM DADOS VÁLIDOS!`);
      }
      
    } catch (error: any) {
      const tempo_ms = Date.now() - startTime;
      
      const result: BancaResult = {
        banca,
        status: 'error',
        concursos_encontrados: 0,
        com_conteudo_programatico: 0,
        tempo_ms,
        erro: error.message
      };
      
      results.push(result);
      
      console.log(`❌ Erro: ${error.message}`);
    }
  }
  
  // Salvar resultados
  const outputFile = '/home/ubuntu/test-all-bancas-results.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  
  // Gerar relatório
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60));
  
  const sucessos = results.filter(r => r.status === 'success');
  const erros = results.filter(r => r.status === 'error');
  const comDados = results.filter(r => r.com_conteudo_programatico > 0);
  
  console.log(`\n✅ Bancas testadas com sucesso: ${sucessos.length}/10`);
  console.log(`❌ Bancas com erro: ${erros.length}/10`);
  console.log(`🎯 Bancas com conteúdo programático: ${comDados.length}/10\n`);
  
  if (comDados.length > 0) {
    console.log('🎯 BANCAS COM DADOS VÁLIDOS:');
    comDados.forEach(r => {
      console.log(`   - ${r.banca.toUpperCase()}: ${r.com_conteudo_programatico} concurso(s)`);
    });
  } else {
    console.log('⚠️  Nenhuma banca retornou conteúdo programático');
  }
  
  if (erros.length > 0) {
    console.log(`\n❌ BANCAS COM ERRO:`);
    erros.forEach(r => {
      console.log(`   - ${r.banca.toUpperCase()}: ${r.erro}`);
    });
  }
  
  console.log(`\n💾 Resultados salvos em: ${outputFile}`);
  console.log(`\n⏱️  Tempo total: ${(results.reduce((sum, r) => sum + r.tempo_ms, 0) / 1000).toFixed(1)}s\n`);
}

testAllBancas().catch(console.error);
