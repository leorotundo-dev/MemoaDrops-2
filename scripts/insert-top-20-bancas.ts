import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para inserir as Top 20 bancas no banco de dados
 * Apenas insere as bancas que ainda não existem
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface BancaData {
  name: string;
  display_name: string;
  website: string;
  concursos_url: string;
  is_active: boolean;
  priority: number;
  tier: number;
  notes: string;
}

const novasBancas: BancaData[] = [
  {
    name: 'idecan',
    display_name: 'IDECAN',
    website: 'https://idecan.org.br',
    concursos_url: 'https://idecan.org.br',
    is_active: true,
    priority: 60,
    tier: 2,
    notes: 'Instituto de Desenvolvimento Educacional - Forte em concursos policiais'
  },
  {
    name: 'iades',
    display_name: 'IADES',
    website: 'https://www.iades.com.br',
    concursos_url: 'https://www.iades.com.br/inscricao/?v=andamento',
    is_active: true,
    priority: 55,
    tier: 2,
    notes: 'Instituto Americano de Desenvolvimento - Forte no DF'
  },
  {
    name: 'fundatec',
    display_name: 'FUNDATEC',
    website: 'https://www.fundatec.org.br',
    concursos_url: 'https://www.fundatec.org.br/portal/concursos/concursos_abertos.php',
    is_active: true,
    priority: 50,
    tier: 2,
    notes: 'Principal banca do Rio Grande do Sul'
  },
  {
    name: 'ibade',
    display_name: 'IBADE',
    website: 'https://www.ibade.org.br',
    concursos_url: 'https://www.ibade.org.br',
    is_active: true,
    priority: 45,
    tier: 2,
    notes: 'Instituto Brasileiro de Apoio - Forte no RJ e ES'
  },
  {
    name: 'consulplan',
    display_name: 'CONSULPLAN',
    website: 'https://www.institutoconsulplan.org.br',
    concursos_url: 'https://www.institutoconsulplan.org.br',
    is_active: true,
    priority: 40,
    tier: 2,
    notes: 'Instituto Consulplan - Diversos estados'
  },
  {
    name: 'objetiva',
    display_name: 'OBJETIVA',
    website: 'https://www.objetivas.com.br',
    concursos_url: 'https://www.objetivas.com.br',
    is_active: true,
    priority: 35,
    tier: 2,
    notes: 'Objetiva Concursos - Forte em concursos municipais'
  },
  {
    name: 'fadesp',
    display_name: 'FADESP',
    website: 'https://www.fadesp.org.br',
    concursos_url: 'https://www.fadesp.org.br',
    is_active: true,
    priority: 30,
    tier: 2,
    notes: 'Fundação de Amparo - Principal banca da região Norte'
  },
  {
    name: 'cetro',
    display_name: 'CETRO',
    website: 'https://www.cetroconcursos.org.br',
    concursos_url: 'https://www.cetroconcursos.org.br',
    is_active: true,
    priority: 25,
    tier: 3,
    notes: 'Centro de Estudos - SP e região'
  },
  {
    name: 'funcern',
    display_name: 'FUNCERN',
    website: 'https://www.funcern.br',
    concursos_url: 'https://www.funcern.br',
    is_active: true,
    priority: 20,
    tier: 3,
    notes: 'Fundação de Apoio - Principal banca do RN'
  },
  {
    name: 'copeve_ufal',
    display_name: 'COPEVE/UFAL',
    website: 'https://www.copeve.ufal.br',
    concursos_url: 'https://www.copeve.ufal.br',
    is_active: true,
    priority: 15,
    tier: 3,
    notes: 'Comissão Permanente da UFAL - Principal banca de Alagoas'
  },
  {
    name: 'fepese',
    display_name: 'FEPESE',
    website: 'https://www.fepese.org.br',
    concursos_url: 'https://www.fepese.org.br',
    is_active: true,
    priority: 10,
    tier: 3,
    notes: 'Fundação de Estudos - Principal banca de Santa Catarina'
  },
  {
    name: 'fumarc',
    display_name: 'FUMARC',
    website: 'https://www.fumarc.org.br',
    concursos_url: 'https://www.fumarc.org.br',
    is_active: true,
    priority: 5,
    tier: 3,
    notes: 'Fundação Mariana Resende Costa - Forte em Minas Gerais'
  }
];

async function insertBancas() {
  try {
    console.log('🚀 Iniciando inserção das Top 20 bancas...\n');

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const banca of novasBancas) {
      try {
        // Verificar se a banca já existe
        const { rows: existing } = await pool.query(
          'SELECT id, name FROM bancas WHERE name = $1',
          [banca.name]
        );

        if (existing.length > 0) {
          console.log(`⏭️  ${banca.display_name} (${banca.name}) já existe (ID: ${existing[0].id})`);
          skipped++;
          continue;
        }

        // Inserir nova banca
        const { rows: [newBanca] } = await pool.query(`
          INSERT INTO bancas (
            name,
            display_name,
            website,
            concursos_url,
            is_active,
            priority,
            tier,
            notes,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING id, name, display_name
        `, [
          banca.name,
          banca.display_name,
          banca.website,
          banca.concursos_url,
          banca.is_active,
          banca.priority,
          banca.tier,
          banca.notes
        ]);

        console.log(`✅ ${newBanca.display_name} (${newBanca.name}) inserida (ID: ${newBanca.id})`);
        inserted++;

      } catch (error: any) {
        console.error(`❌ Erro ao inserir ${banca.display_name}:`);
        console.error(`   Mensagem: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        errors++;
      }
    }

    console.log('\n📊 RESUMO:');
    console.log(`   ✅ Inseridas: ${inserted}`);
    console.log(`   ⏭️  Já existiam: ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📝 Total processadas: ${novasBancas.length}`);

    // Listar todas as bancas ativas
    const { rows: allBancas } = await pool.query(`
      SELECT id, name, display_name, priority, tier
      FROM bancas
      WHERE is_active = true
      ORDER BY priority DESC
    `);

    console.log('\n📋 BANCAS ATIVAS NO SISTEMA:');
    console.log('ID  | Nome              | Prioridade | Tier');
    console.log('----+-------------------+------------+-----');
    allBancas.forEach(b => {
      console.log(`${String(b.id).padStart(3)} | ${b.display_name.padEnd(17)} | ${String(b.priority).padStart(10)} | ${b.tier}`);
    });

    await pool.end();
    console.log('\n✅ Script concluído com sucesso!');

  } catch (error: any) {
    console.error('❌ Erro fatal:');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

insertBancas();
