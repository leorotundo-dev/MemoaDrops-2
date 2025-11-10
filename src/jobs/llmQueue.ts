import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { generateFlashcards } from '../services/llm.js';
import { chunkContent, processScrapedContent } from '../services/contentProcessor.js';
import OpenAI from 'openai';
import { pool } from '../db/connection.js';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Conexão dedicada para a fila LLM
const llmConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  enableOfflineQueue: false,
});

export const llmQueue = new Queue('llm-processing', {
  connection: llmConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 500,
  },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMB_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

async function ensureEmbedding(cardId: string, text: string) {
  try {
    const r = await openai.embeddings.create({ model: EMB_MODEL, input: text });
    const emb = r.data[0]?.embedding;
    if (emb && emb.length) {
      try {
        await pool.query('INSERT INTO card_embeddings(card_id, embedding) VALUES ($1,$2) ON CONFLICT (card_id) DO UPDATE SET embedding = EXCLUDED.embedding', [cardId, JSON.stringify(emb)]);
      } catch {
        try { await pool.query('UPDATE cards SET embedding=$2 WHERE id=$1', [cardId, JSON.stringify(emb)]); } catch {}
      }
    }
  } catch (e) {
    // ignore
  }
}

export async function addGenerateFlashcardsJob(data: {
  url?: string;
  text?: string;
  userId: string;
  deckId?: string;
  options?: { subject?: string; count?: number };
}) {
  return llmQueue.add('generate', data);
}

export async function processLLMJob(job: Job): Promise<{ cardsCreated: number; deckId: string }> {
  const { url, text, userId, deckId, options } = job.data as {
    url?: string; text?: string; userId: string; deckId?: string; options?: { subject?: string; count?: number; };
  };

  let content: string;
  
  if (text) {
    job.updateProgress({ step: 'text', progress: 10 });
    content = text;
  } else if (url) {
    job.updateProgress({ step: 'fetch', progress: 5 });
    const processed = await processScrapedContent(url);
    content = processed.content;
  } else {
    throw new Error('url ou text devem ser fornecidos');
  }

  job.updateProgress({ step: 'chunk', progress: 15 });
  const chunks = chunkContent(content, 3000);

  let deckIdToUse = deckId;
  if (!deckIdToUse) {
    const title = options?.subject ? `Auto • ${options.subject}` : 'Auto • Geral';
    const r = await pool.query(
      `INSERT INTO decks(user_id, title)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [userId, title]
    );
    deckIdToUse = r.rows[0]?.id;
    if (!deckIdToUse) {
      const q = await pool.query('SELECT id FROM decks WHERE user_id=$1 AND title=$2 LIMIT 1', [userId, title]);
      deckIdToUse = q.rows[0]?.id;
    }
  }
  if (!deckIdToUse) throw new Error('deck_not_found_or_create_failed');

  let created = 0;
  let totalTarget = Math.min(Math.max(options?.count ?? 10, 5), 50);
  const perChunk = Math.max(5, Math.floor(totalTarget / Math.max(1, chunks.length)));

  for (let i = 0; i < chunks.length && created < totalTarget; i++) {
    job.updateProgress({ step: 'llm', chunk: i + 1, progress: 20 + Math.floor((i / chunks.length) * 60) });
    const cards = await generateFlashcards(chunks[i], { subject: options?.subject, count: perChunk });
    for (const c of cards) {
      if (created >= totalTarget) break;
      const ins = await pool.query(
        `INSERT INTO cards(deck_id, front, back) VALUES ($1,$2,$3) RETURNING id`,
        [deckIdToUse, c.front, c.back]
      );
      const cardId = ins.rows[0]?.id;
      if (cardId) {
        created++;
        ensureEmbedding(cardId, `${c.front}\n${c.back}`).catch(()=>{});
      }
    }
  }

  await job.updateProgress({ step: 'done', progress: 100 });
  return { cardsCreated: created, deckId: deckIdToUse };
}
