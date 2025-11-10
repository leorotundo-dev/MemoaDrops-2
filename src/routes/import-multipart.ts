import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import multipart from '@fastify/multipart';
import AdmZip from 'adm-zip';
import { z } from 'zod';
import { pool } from '../db/connection.js';

export async function importMultipartRoutes(app: FastifyInstance){
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });

  // CSV simples (front,back)
  app.post('/import/upload/csv', { preHandler: [authenticate] }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'file_required' });
    const deckId = (req.headers['x-deck-id'] as string) || (req.query as any)?.deckId;
    if (!deckId) return reply.code(400).send({ error: 'deckId_required' });
    const text = await data.toBuffer();
    const rows = text.toString('utf-8').split(/\r?\n/).filter(Boolean).map(l => l.split(','));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of rows){
        const [front, back] = r;
        if (front && back){
          await client.query('INSERT INTO cards(deck_id, front, back) VALUES ($1,$2,$3)', [deckId, front.trim(), back.trim()]);
        }
      }
      await client.query('COMMIT');
      return { ok: true, imported: rows.length };
    } catch (e){
      await client.query('ROLLBACK'); throw e;
    } finally {
      client.release();
    }
  });

  // Anki .apkg (básico: extrai collection.anki2 + media - requer parsing externo para virar cards)
  app.post('/import/upload/anki', { preHandler: [authenticate] }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'file_required' });
    const buf = await data.toBuffer();
    const zip = new AdmZip(buf);
    const entries = zip.getEntries().map(e => e.entryName);
    return { ok: true, entries }; // Client-side/worker depois processa para cards
  });
}
