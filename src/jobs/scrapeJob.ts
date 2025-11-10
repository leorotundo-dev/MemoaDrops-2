import { pool } from '../db/connection.js';
import { scrapeContestMock } from '../services/scraper.js';
import { addVector } from './queues.js';

export async function scrapeProcessor(data: { douUrl: string }) {
  const { douUrl } = data;
  const client = await pool.connect();
  try {
    const found = await client.query('SELECT id FROM concursos WHERE dou_url = $1', [douUrl]);
    let contestId: number;
    if (found.rows[0]) {
      contestId = found.rows[0].id;
    } else {
      const name = 'Concurso ' + (douUrl.split('/').pop() || 'Oficial');
      const ins = await client.query('INSERT INTO concursos (nome, dou_url) VALUES ($1,$2) RETURNING id', [name, douUrl]);
      contestId = ins.rows[0].id;
    }

    const result = await scrapeContestMock(douUrl);
    let contents = 0;
    for (const m of result.materias) {
      const matIns = await client.query('INSERT INTO materias (contest_id, nome) VALUES ($1,$2) RETURNING id', [contestId, m.nome]);
      const matId = matIns.rows[0].id;
      for (const texto of m.conteudos) {
        const cIns = await client.query('INSERT INTO conteudos (materia_id, texto) VALUES ($1,$2) RETURNING id', [matId, texto]);
        contents++;
        await addVector(cIns.rows[0].id);
      }
    }

    await client.query('INSERT INTO jobs (type, status, data, result) VALUES ($1,$2,$3,$4)',
      ['scrape', 'completed', { douUrl }, { contestId, contents }] as any);

    return { contestId, contents };
  } finally {
    client.release();
  }
}
