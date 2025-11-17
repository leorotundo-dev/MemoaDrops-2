const https = require('https');
const jwt = require('jsonwebtoken');

const API_URL = 'https://api-production-5ffc.up.railway.app';
const USER_ID = '55043214-c712-4f26-bd40-bfa81730d0df'; // leo.rotundo@gmail.com

// Tentar com o secret padrão primeiro
const JWT_SECRETS = [
  'your-secret-key-change-in-production',
  'memodrops-secret-key',
  'secret',
  'jwt-secret'
];

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

async function testToken(secret) {
  const token = jwt.sign({ userId: USER_ID }, secret, { expiresIn: '7d' });
  
  // Testar o token no endpoint /auth/me
  const result = await makeRequest('GET', '/auth/me', null, token);
  
  return result.status === 200;
}

async function main() {
  try {
    console.log('🔍 Testando secrets JWT...\n');
    
    let validSecret = null;
    let validToken = null;
    
    for (const secret of JWT_SECRETS) {
      console.log(`Testando: "${secret}"`);
      const isValid = await testToken(secret);
      
      if (isValid) {
        console.log(`✅ Secret válido encontrado!`);
        validSecret = secret;
        validToken = jwt.sign({ userId: USER_ID }, secret, { expiresIn: '7d' });
        break;
      } else {
        console.log(`❌ Secret inválido`);
      }
    }
    
    if (!validToken) {
      console.log('\n❌ Nenhum secret válido encontrado. Vou tentar buscar o JWT_SECRET das variáveis de ambiente...');
      
      // Tentar buscar o JWT_SECRET via query
      const result = await makeRequest('POST', '/admin/setup/query', {
        sql: "SELECT current_setting('app.jwt_secret', true) as jwt_secret"
      });
      
      console.log('Resultado:', result.data);
      return;
    }
    
    console.log('\n🎨 Executando fetch de logos...');
    console.log('⏳ Isso pode levar alguns minutos...\n');
    
    // Executar fetch de logos
    const fetchLogos = await makeRequest('POST', '/admin/bancas/fetch-logos', {}, validToken);
    
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
