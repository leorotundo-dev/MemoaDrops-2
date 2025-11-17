const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada!');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function updateAllContestCounts() {
  try {
    console.log('🔄 Atualizando contadores de concursos...\n');

    // Buscar todas as bancas
    const { rows: bancas } = await pool.query('SELECT id, display_name FROM bancas ORDER BY display_name');

    for (const banca of bancas) {
      // Contar concursos
      const { rows: [count] } = await pool.query(
        'SELECT COUNT(*)::int as total FROM concursos WHERE banca_id = $1',
        [banca.id]
      );

      // Atualizar contador
      await pool.query(
        'UPDATE bancas SET total_contests = $1 WHERE id = $2',
        [count.total, banca.id]
      );

      console.log(`✅ ${banca.display_name}: ${count.total} concursos`);
    }

    console.log('\n🎉 Todos os contadores foram atualizados!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

updateAllContestCounts();
