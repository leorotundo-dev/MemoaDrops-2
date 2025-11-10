import request from 'supertest';
import { buildTestApp } from '../test/helpers/buildTestApp';
import { makeAuthHeader } from '../test/helpers/auth';

describe('LLM Routes', () => {
  let app: any;
  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    try { await app.close(); } catch {}
  });

  it('POST /llm/generate/text -> 202 + jobId', async () => {
    const res = await request(app.server)
      .post('/llm/generate/text')
      .set('Authorization', makeAuthHeader())
      .send({ text: 'Conteúdo de teste com mais de 50 caracteres para gerar flashcards automaticamente.', count: 10 });

    expect([200,202]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('jobId');
  });
});
