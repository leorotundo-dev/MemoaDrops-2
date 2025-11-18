const jwt = require('jsonwebtoken');
const https = require('https');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const userId = 1; // Admin user

const token = jwt.sign({ userId, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

const options = {
  hostname: 'api-production-5ffc.up.railway.app',
  path: '/admin/costs/populate',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Erro:', e.message);
});

req.end();
