const https = require('https');
const http = require('http');
const { Pool } = require('pg');
require('dotenv').config();

// Configurar pool do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/memodrops',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// URLs de logos conhecidos
const LOGO_URLS = {
  'aocp': [
    'https://www.aocp.com.br/img/logo.png',
    'https://www.institutoaocp.org.br/images/logo.png'
  ],
  'cebraspe': [
    'https://www.cebraspe.org.br/img/logo.svg',
    'https://www.cespe.unb.br/img/logo.png'
  ],
  'fcc': [
    'https://www.fcc.org.br/img/logo.svg',
    'https://www.concursosfcc.com.br/img/logo.png'
  ],
  'fundatec': [
    'https://www.fundatec.org.br/img/logo.svg',
    'https://www.fundatec.org.br/portal/img/logo.png'
  ],
  'ibfc': [
    'https://www.ibfc.org.br/img/logo.png',
    'https://www.ibfc.org.br/images/logo.svg'
  ],
  'idecan': [
    'https://www.idecan.org.br/img/logo.png',
    'https://www.idecan.org.br/images/logo.svg'
  ],
  'vunesp': [
    'https://www.vunesp.com.br/img/logo.svg',
    'https://www.vunesp.com.br/images/logo.png'
  ]
};

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mimeType = res.headers['content-type'] || 'image/png';
        resolve({ buffer, mimeType });
      });
    }).on('error', reject);
  });
}

async function saveLogo(bancaId, buffer, mimeType) {
  try {
    await pool.query(
      `UPDATE bancas 
       SET logo_data = $1, logo_mime_type = $2, updated_at = NOW()
       WHERE id = $3`,
      [buffer, mimeType, bancaId]
    );
    return true;
  } catch (error) {
    console.error(`Erro ao salvar logo da banca ${bancaId}:`, error.message);
    return false;
  }
}

async function fetchLogoForBanca(bancaId, bancaSlug) {
  const urls = LOGO_URLS[bancaSlug] || [];
  
  console.log(`\n🔍 Buscando logo para ${bancaSlug} (ID: ${bancaId})...`);
  
  for (const url of urls) {
    try {
      console.log(`  Tentando: ${url}`);
      const { buffer, mimeType } = await downloadImage(url);
      
      if (buffer.length > 0) {
        const saved = await saveLogo(bancaId, buffer, mimeType);
        if (saved) {
          console.log(`  ✅ Logo salvo! (${buffer.length} bytes, ${mimeType})`);
          return true;
        }
      }
    } catch (error) {
      console.log(`  ❌ Falhou: ${error.message}`);
    }
  }
  
  console.log(`  ⚠️  Nenhuma URL funcionou para ${bancaSlug}`);
  return false;
}

async function main() {
  try {
    console.log('🎨 Buscando logos das bancas...\n');
    
    const bancas = [
      { id: 58, slug: 'aocp' },
      { id: 53, slug: 'cebraspe' },
      { id: 56, slug: 'fcc' },
      { id: 62, slug: 'fundatec' },
      { id: 57, slug: 'ibfc' },
      { id: 59, slug: 'idecan' },
      { id: 55, slug: 'vunesp' }
    ];
    
    let success = 0;
    let failed = 0;
    
    for (const banca of bancas) {
      const result = await fetchLogoForBanca(banca.id, banca.slug);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      // Delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ✅ Sucesso: ${success}`);
    console.log(`   ❌ Falhou: ${failed}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
