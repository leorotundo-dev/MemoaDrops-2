import { scrapeAllBancasContests } from '../src/services/contest-discovery-scraper.js';

/**
 * Script para rodar todos os scrapers de bancas
 */
async function main() {
  try {
    console.log('🚀 Iniciando scraping de todas as bancas...\n');
    
    const result = await scrapeAllBancasContests();
    
    console.log('\n✅ Scraping concluído!');
    console.log(`📊 Total encontrado: ${result.total}`);
    console.log(`💾 Total salvo: ${result.saved}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar scrapers:', error);
    process.exit(1);
  }
}

main();
