import request from 'supertest';
const BASE = process.env.BASE_URL || 'http://localhost:3001';

describe('Import CSV', () => {
  let token: string = '';
  let deckId: string = '';
  beforeAll(async () => {
    const email = `csv_${Date.now()}@md.io`;
    const password = '12345678';
    await request(BASE).post('/auth/register').send({ email, password });
    const log = await request(BASE).post('/auth/login').send({ email, password });
    token = log.body.token;
    const d = await request(BASE).post('/decks').set('Authorization', `Bearer ${token}`).send({ title: 'CSV Deck' });
    deckId = d.body.id;
  });

  it('import simple CSV', async () => {
    const csv = 'Frente,Verso\nO que é Constituição?,Conjunto de normas fundamentais';
    const res = await request(BASE)
      .post('/import/upload/csv?deckId=' + deckId)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/csv')
      .send(csv);
    expect(res.status).toBe(200);
  });
});
