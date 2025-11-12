import 'dotenv/config';
import { pool } from '../src/db/connection.js';
import { fetchAndSaveLogo } from '../src/services/logo-fetcher.js';

/**
 * Script para buscar e baixar logos de todas as bancas existentes
 * que ainda não possuem logo ou possuem logo inválida
 */
async function backfillLogos() {
  try {
    console.log('Iniciando backfill de logos das bancas...\n');

    // Buscar todas as bancas
    const { rows: bancas } = await pool.query(`
      SELECT id, name, display_name, website_url, logo_url
      FROM bancas
      ORDER BY id ASC
    `);

    console.log(`Total de bancas encontradas: ${bancas.length}\n`);

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const banca of bancas) {
      console.log(`\n[${banca.id}] Processando: ${banca.display_name}`);
      console.log(`  Logo atual: ${banca.logo_url || 'Nenhuma'}`);

      // Sempre tentar buscar nova logo (forçar atualização)
      try {
        const logoPath = await fetchAndSaveLogo(
          banca.display_name,
          banca.id,
          banca.website_url
        );

        if (logoPath) {
          // Atualizar banco de dados
          await pool.query(
            'UPDATE bancas SET logo_url = $1, updated_at = NOW() WHERE id = $2',
            [logoPath, banca.id]
          );
          
          console.log(`  ✓ Logo salva: ${logoPath}`);
          successCount++;
        } else {
          console.log(`  ✗ Não foi possível obter logo`);
          failureCount++;
        }
      } catch (error) {
        console.error(`  ✗ Erro ao processar logo:`, error);
        failureCount++;
      }

      // Aguardar um pouco entre requisições para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Backfill concluído!');
    console.log(`  Sucesso: ${successCount}`);
    console.log(`  Falhas: ${failureCount}`);
    console.log(`  Ignoradas: ${skippedCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Erro fatal no backfill:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Executar script
backfillLogos();
