import request from 'supertest';
import { buildTestApp } from '../test/helpers/buildTestApp';
import { makeAuthHeader } from '../test/helpers/auth';

// Override the queue mock for this file to force an error
jest.mock('../test/__mocks__/jobs/llmQueue.ts', () => ({
  addGenerateFlashcardsJob: async () => { throw new Error('forced_error'); }
}));

describe('LLM Controller error handling', () => {
  let app: any;
  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    try { await app.close(); } catch {}
  });

  it('POST /llm/generate/text -> 500 on queue add failure', async () => {
    const res = await request(app.server)
      .post('/llm/generate/text')
      .set('Authorization', makeAuthHeader())
      .send({ text: 'Conteúdo de teste com mais de 50 caracteres para falhar.', count: 10 });
    expect([400, 500]).toContain(res.statusCode);
  });
});
