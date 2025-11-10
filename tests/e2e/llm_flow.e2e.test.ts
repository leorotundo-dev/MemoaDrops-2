import request from 'supertest';
const BASE = process.env.BASE_URL || 'http://localhost:3001';

describe('LLM Flow (mocked)', () => {
  let token: string = '';
  let deckId: string = '';

  beforeAll(async () => {
    const email = `llm_${Date.now()}@md.io`;
    const password = '12345678';
    await request(BASE).post('/auth/register').send({ email, password });
    const log = await request(BASE).post('/auth/login').send({ email, password });
    token = log.body.token;
    const d = await request(BASE).post('/decks').set('Authorization', `Bearer ${token}`).send({ title: 'E2E Deck' });
    deckId = d.body.id;
  });

  it('enqueue generate from text (should accept 202)', async () => {
    const res = await request(BASE)
      .post('/llm/generate/text')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Lei 8.666 é a antiga lei de licitações...', count: 5, deckId });
    expect([200,202]).toContain(res.status);
    expect(res.body.jobId || res.body.id).toBeTruthy();
  });
});
