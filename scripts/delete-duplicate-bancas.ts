import { pool } from '../src/db/connection.js';

async function deleteDuplicateBancas() {
  try {
    console.log('🗑️  Deletando bancas duplicadas...\n');

    // IDs das bancas duplicadas para deletar
    const duplicateIds = [
      14, // INSTITUTO AOCP (manter AOCP ID 11)
      19, // instituto_aocp (manter AOCP ID 11)
      16, // cespe_cebraspe (manter CEBRASPE ID 1)
      17, // fundacao_carlos_chagas (manter FCC ID 2)
      18, // fundacao_getulio_vargas (manter FGV ID 3)
      37, // objetiva minúscula (manter OBJETIVA ID 15)
    ];

    for (const id of duplicateIds) {
      // Buscar info da banca antes de deletar
      const { rows: [banca] } = await pool.query(`
        SELECT id, name FROM bancas WHERE id = $1
      `, [id]);

      if (banca) {
        // Deletar
        await pool.query(`DELETE FROM bancas WHERE id = $1`, [id]);
        console.log(`✅ Deletado: ID ${id} - ${banca.name}`);
      } else {
        console.log(`⚠️  Não encontrado: ID ${id}`);
      }
    }

    console.log('\n✅ Limpeza concluída!');
    console.log(`\n📊 Total deletado: ${duplicateIds.length} bancas`);

    // Mostrar bancas restantes
    const { rows: bancas } = await pool.query(`
      SELECT COUNT(*) as total FROM bancas
    `);
    console.log(`📊 Bancas restantes: ${bancas[0].total}`);

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

deleteDuplicateBancas();
