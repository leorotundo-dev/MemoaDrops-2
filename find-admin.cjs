const https = require('https');

const API_URL = 'https://api-production-5ffc.up.railway.app';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

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

async function main() {
  try {
    console.log('🔍 Buscando usuários admin...');
    
    const result = await makeRequest('POST', '/admin/setup/query', {
      sql: "SELECT id, email, name, role FROM users WHERE role IN ('admin', 'superadmin') LIMIT 5"
    });
    
    console.log('\n📋 Usuários encontrados:');
    console.log(JSON.stringify(result.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
