const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');

const API_URL = 'https://api-production-5ffc.up.railway.app';
const JWT_SECRET = 'your-secret-key-change-in-production';
const USER_ID = '55043214-c712-4f26-bd40-bfa81730d0df';

// Mapeamento de bancas
const BANCAS = {
  'aocp': { id: 58, file: 'aocp.jpg', mime: 'image/jpeg' },
  'cebraspe': { id: 53, file: 'cebraspe.jpg', mime: 'image/jpeg' },
  'fcc': { id: 56, file: 'fcc.jpg', mime: 'image/jpeg' },
  'fundatec': { id: 62, file: 'fundatec.png', mime: 'image/png' },
  'ibfc': { id: 57, file: 'ibfc.png', mime: 'image/png' },
  'idecan': { id: 59, file: 'idecan.png', mime: 'image/png' },
  'vunesp': { id: 55, file: 'vunesp.jpg', mime: 'image/jpeg' }
};

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function uploadLogo(bancaId, filePath, mimeType, token) {
  try {
    // Ler arquivo
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    
    // Enviar via SQL query
    const sql = `
      UPDATE bancas 
      SET logo_data = decode('${base64}', 'base64'),
          logo_mime_type = '${mimeType}',
          updated_at = NOW()
      WHERE id = ${bancaId}
    `;
    
    const result = await makeRequest('POST', '/admin/setup/query', { sql }, token);
    
    return result.status === 200;
    
  } catch (error) {
    console.error(`Erro ao fazer upload:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🎨 Fazendo upload dos logos...\n');
    
    // Gerar token
    const token = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '1h' });
    
    let success = 0;
    let failed = 0;
    
    for (const [slug, info] of Object.entries(BANCAS)) {
      const filePath = `/home/ubuntu/MemoaDrops-2/logos/${info.file}`;
      
      console.log(`📤 Enviando ${slug} (ID: ${info.id})...`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`  ❌ Arquivo não encontrado: ${filePath}`);
        failed++;
        continue;
      }
      
      const result = await uploadLogo(info.id, filePath, info.mime, token);
      
      if (result) {
        console.log(`  ✅ Logo enviado com sucesso!`);
        success++;
      } else {
        console.log(`  ❌ Falha ao enviar logo`);
        failed++;
      }
      
      // Delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ✅ Sucesso: ${success}`);
    console.log(`   ❌ Falhou: ${failed}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
