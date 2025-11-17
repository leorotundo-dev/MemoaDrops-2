const https = require('https');

const API_URL = 'https://api-production-5ffc.up.railway.app';

// Função para fazer requisições HTTPS
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

async function main() {
  try {
    console.log('🔧 Criando usuário admin temporário...');
    
    // Criar admin temporário
    const createAdmin = await makeRequest('POST', '/admin/setup/create-admin', {
      email: 'temp-admin@memodrops.com',
      password: 'TempPass123!',
      name: 'Temp Admin'
    });
    
    console.log('Admin criado:', createAdmin.data);
    
    console.log('\n🔐 Fazendo login...');
    
    // Fazer login
    const login = await makeRequest('POST', '/auth/login', {
      email: 'temp-admin@memodrops.com',
      password: 'TempPass123!'
    });
    
    if (login.status !== 200) {
      console.error('❌ Erro ao fazer login:', login.data);
      return;
    }
    
    const token = login.data.token;
    console.log('✅ Login realizado! Token obtido.');
    
    console.log('\n🎨 Executando fetch de logos...');
    console.log('⏳ Isso pode levar alguns minutos...\n');
    
    // Executar fetch de logos
    const fetchLogos = await makeRequest('POST', '/admin/bancas/fetch-logos', {}, token);
    
    if (fetchLogos.status === 200) {
      console.log('✅ SUCESSO!');
      console.log(JSON.stringify(fetchLogos.data, null, 2));
    } else {
      console.error('❌ Erro ao executar fetch:', fetchLogos.data);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
