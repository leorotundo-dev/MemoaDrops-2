import { scrapeAllBancasContests } from './src/services/contest-discovery-scraper.js';

console.log('🚀 Iniciando scraper de todas as bancas...\n');

try {
  const result = await scrapeAllBancasContests();
  console.log('\n✅ Scraping concluído!');
  console.log(`📊 Total encontrado: ${result.total}`);
  console.log(`💾 Total salvo: ${result.saved}`);
} catch (error: any) {
  console.error('❌ Erro:', error.message);
  console.error(error.stack);
  process.exit(1);
}
