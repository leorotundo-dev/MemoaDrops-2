const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function populateCosts() {
  console.log('Populando tabela cost_events com dados de exemplo...');
  
  // Gerar eventos dos últimos 30 dias
  const events = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const ts = date.toISOString();
    
    // Geração de matérias (OpenAI GPT-4)
    events.push({
      ts,
      provider: 'openai',
      service: 'gpt-4',
      env: 'prod',
      feature: 'gerar_materias',
      unit: 'tokens',
      quantity: Math.floor(Math.random() * 50000) + 10000, // 10k-60k tokens/dia
      currency: 'BRL',
      unit_price: 0.00015, // R$ 0.15 por 1k tokens
      meta: {}
    });
    
    // Processamento de PDFs
    events.push({
      ts,
      provider: 'internal',
      service: 'pdf_processor',
      env: 'prod',
      feature: 'processar_pdf',
      unit: 'documents',
      quantity: Math.floor(Math.random() * 10) + 2, // 2-12 PDFs/dia
      currency: 'BRL',
      unit_price: 0.50, // R$ 0.50 por PDF
      meta: {}
    });
    
    // Scraping de concursos
    events.push({
      ts,
      provider: 'internal',
      service: 'scraper',
      env: 'prod',
      feature: 'harvester',
      unit: 'requests',
      quantity: Math.floor(Math.random() * 100) + 50, // 50-150 requests/dia
      currency: 'BRL',
      unit_price: 0.01, // R$ 0.01 por request
      meta: {}
    });
    
    // Geração de decks/cards
    events.push({
      ts,
      provider: 'openai',
      service: 'gpt-4',
      env: 'prod',
      feature: 'gerar_deck',
      unit: 'tokens',
      quantity: Math.floor(Math.random() * 30000) + 5000, // 5k-35k tokens/dia
      currency: 'BRL',
      unit_price: 0.00015,
      meta: {}
    });
  }
  
  // Inserir eventos
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const ev of events) {
      const total = Number((ev.quantity * ev.unit_price).toFixed(6));
      await client.query(`
        INSERT INTO cost_events (ts, provider, service, env, feature, banca, resource_id, unit, quantity, currency, unit_price, total_cost, meta)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [ev.ts, ev.provider, ev.service, ev.env, ev.feature, null, null, ev.unit, ev.quantity, ev.currency, ev.unit_price, total, ev.meta]);
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${events.length} eventos de custo inseridos com sucesso!`);
    
    // Mostrar resumo
    const { rows } = await client.query(`
      SELECT feature, ROUND(SUM(total_cost)::numeric, 2) AS total_brl, COUNT(*) AS events
      FROM cost_events
      WHERE env = 'prod'
      GROUP BY feature
      ORDER BY total_brl DESC
    `);
    
    console.log('\n📊 Resumo por feature:');
    rows.forEach(r => {
      console.log(`  ${r.feature}: R$ ${r.total_brl} (${r.events} eventos)`);
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

populateCosts();
