import OpenAI from 'openai';
import { AppError } from '../errors/AppError.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

type GenOptions = {
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
};

export type GeneratedCard = { front: string; back: string; tags?: string[] };

// simple in-memory rate limiter (10 req/min) per process
const WINDOW_MS = 60_000;
const LIMIT = 10;
let calls: number[] = [];
function assertRateLimit() {
  const now = Date.now();
  calls = calls.filter(ts => now - ts < WINDOW_MS);
  if (calls.length >= LIMIT) throw new AppError('LLM rate limit exceeded', 429);
  calls.push(now);
}

function toCardArray(json: string): GeneratedCard[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(it => typeof it?.front === 'string' && typeof it?.back === 'string')
        .map(it => ({ front: it.front.trim(), back: it.back.trim(), tags: Array.isArray(it.tags) ? it.tags : undefined }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function generateFlashcards(content: string, options: GenOptions = {}): Promise<GeneratedCard[]> {
  assertRateLimit();
  const count = Math.min(Math.max(options.count ?? 10, 5), 50);
  const sys = 'Você é um especialista em criar flashcards para concursos públicos. Responda APENAS JSON válido.';
  const prompt = [
    'Você é um especialista em criar flashcards para concursos públicos.',
    `Analise o seguinte conteúdo e crie ${count} flashcards de alta qualidade:`,
    'CONTEÚDO:',
    content,
    'REGRAS:',
    '1. Cada flashcard deve ter uma pergunta clara (front) e resposta concisa (back)',
    '2. Foque em conceitos importantes e definições',
    '3. Use linguagem objetiva',
    '4. Evite perguntas muito longas',
    '5. Inclua exemplos quando relevante',
    '6. Adicione tags para categorização',
    'FORMATO DE SAÍDA (JSON):',
    '[{"front":"Pergunta","back":"Resposta","tags":["tag1","tag2"]}]'
  ].join('\n');

  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' } as any  // ensure JSON
  });

  const raw = resp.choices[0]?.message?.content || '[]';
  // some models wrap in {"items":[...]} — normalize
  let json = raw;
  try {
    const maybeObj = JSON.parse(raw);
    if (Array.isArray(maybeObj)) json = raw;
    else if (Array.isArray(maybeObj?.items)) json = JSON.stringify(maybeObj.items);
    else if (Array.isArray(maybeObj?.flashcards)) json = JSON.stringify(maybeObj.flashcards);
    else json = '[]';
  } catch { /* keep raw */ }
  const cards = toCardArray(json);
  if (!cards.length) throw new AppError('LLM returned empty/invalid cards', 502);
  return cards;
}

export async function improveFlashcard(front: string, back: string): Promise<{ front: string; back: string; suggestions?: string[]; }> {
  assertRateLimit();
  const sys = 'Você é um editor pedagógico especializado em concursos. Responda APENAS JSON.';
  const user = `Melhore o flashcard a seguir, mantendo a ideia original e a objetividade.
FRONT: ${front}
BACK: ${back}
Formato de saída:
{"front":"...","back":"...","suggestions":["...","..."]}`;
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' } as any
  });
  try {
    const out = JSON.parse(resp.choices[0]?.message?.content || '{}');
    if (typeof out?.front === 'string' && typeof out?.back === 'string') return out;
  } catch {}
  throw new AppError('LLM could not improve flashcard', 502);
}

export async function extractTopics(content: string): Promise<string[]> {
  assertRateLimit();
  const sys = 'Você extrai tópicos principais de um conteúdo. Responda APENAS JSON { "topics": string[] }.';
  const user = `Extraia até 10 tópicos curtos e objetivos do conteúdo a seguir:\n${content}`;
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' } as any
  });
  try {
    const out = JSON.parse(resp.choices[0]?.message?.content || '{}');
    if (Array.isArray(out?.topics)) return out.topics.map((t: any) => String(t).trim()).filter(Boolean);
  } catch {}
  return [];
}
