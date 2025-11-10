import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';
import { AppError } from '../errors/AppError.js';
import { improveFlashcard } from '../services/llm.js';
import { addGenerateFlashcardsJob } from '../jobs/llmQueue.js';
import { extractTextFromBuffer } from '../services/fileExtract.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function improveCardController(req: FastifyRequest, reply: FastifyReply) {
  const ps = z.object({ cardId: z.string().uuid() }).safeParse(req.params);
  if (!ps.success) return reply.code(400).send({ error: ps.error.issues });
  const userId = (req as any).userId as string;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM cards WHERE id=$1 AND deck_id IN (SELECT id FROM decks WHERE user_id=$2)',
      [ps.data.cardId, userId]
    );
    if (!rows[0]) throw new AppError('Card não encontrado ou acesso negado', 404);
    const card = rows[0];

    const improved = await improveFlashcard(card.front, card.back);

    // salva versão anterior
    await client.query(
      'INSERT INTO card_versions(card_id, user_id, front, back) VALUES ($1,$2,$3,$4)',
      [ps.data.cardId, userId, card.front, card.back]
    );

    const { rows: updated } = await client.query(
      'UPDATE cards SET front=$1, back=$2 WHERE id=$3 RETURNING *',
      [improved.front, improved.back, ps.data.cardId]
    );
    await client.query('COMMIT');
    return reply.code(200).send(updated[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    const status = e instanceof AppError ? e.status : 500;
    return reply.code(status).send({ error: (e as any).message || 'Erro ao melhorar card' });
  } finally { client.release(); }
}

export async function generateFlashcardsFromFileController(req: FastifyRequest, reply: FastifyReply) {
  const data = await (req as any).file?.();
  if (!data) return reply.code(400).send({ error: 'Arquivo é obrigatório' });
  const buf = await data.toBuffer();
  const text = await extractTextFromBuffer(buf, data.mimetype, data.filename);
  if (!text || text.trim().length < 20) return reply.code(400).send({ error: 'Não foi possível extrair texto do arquivo' });

  const fields = Object.fromEntries(Object.entries((data as any).fields || {}).map(([k, v]: any) => [k, Array.isArray(v) ? v[0].value : (v?.value ?? v)] ));
  const schema = z.object({
    deckId: z.string().uuid().optional(),
    subject: z.string().optional(),
    count: z.coerce.number().int().min(5).max(50).optional()
  }).safeParse({ deckId: fields.deckId, subject: fields.subject, count: fields.count });
  if (!schema.success) return reply.code(400).send({ error: schema.error.issues });

  const userId = (req as any).userId as string;
  const job = await addGenerateFlashcardsJob({
    text, userId,
    deckId: schema.data.deckId,
    options: { subject: schema.data.subject, count: schema.data.count || 10 }
  });
  return reply.code(202).send({ jobId: job.id });
}

export async function generateFlashcardsFromImageController(req: FastifyRequest, reply: FastifyReply) {
  const data = await (req as any).file?.();
  if (!data) return reply.code(400).send({ error: 'Imagem é obrigatória' });
  const buf = await data.toBuffer();
  const base64 = buf.toString('base64');
  const mimetype = (data.mimetype || 'image/jpeg');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extraia todo o texto desta imagem.' },
        { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64}` } }
      ]
    }]
  });
  const text = response.choices?.[0]?.message?.content || '';
  if (!text) return reply.code(400).send({ error: 'Não foi possível extrair texto da imagem' });

  const userId = (req as any).userId as string;
  const job = await addGenerateFlashcardsJob({ text, userId });
  return reply.code(202).send({ jobId: job.id });
}
