import request from 'supertest';
const BASE = process.env.BASE_URL || 'http://localhost:3001';

describe('Auth E2E', () => {
  it('register -> login -> /auth/me', async () => {
    const email = `test_${Date.now()}@md.io`;
    const password = '12345678';
    const name = 'Test';
    const reg = await request(BASE).post('/auth/register').send({ email, password, name });
    expect([200,201]).toContain(reg.status);
    const log = await request(BASE).post('/auth/login').send({ email, password });
    expect(log.status).toBe(200);
    const token = log.body?.token;
    expect(token).toBeTruthy();
    const me = await request(BASE).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body?.email).toBe(email);
  });
});
