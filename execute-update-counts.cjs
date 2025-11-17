const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: 1, email: 'leo.rotundo@gmail.com', role: 'admin' },
  process.env.JWT_SECRET || 'your-secret-key-here',
  { expiresIn: '1h' }
);

fetch('https://api-production-5ffc.up.railway.app/admin/bancas/update-counts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
})
.then(res => res.json())
.then(data => {
  console.log('✅ Resposta:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('❌ Erro:', err.message);
});
