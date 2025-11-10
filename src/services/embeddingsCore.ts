import 'dotenv/config';

const DIMS = 1536;

function deterministic(text: string): number[] {
  const out = new Array<number>(DIMS).fill(0);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  for (let i = 0; i < DIMS; i++) {
    const v = Math.sin((h + i * 374761393) % 104729) * 0.5 + 0.5;
    out[i] = v;
  }
  const norm = Math.sqrt(out.reduce((s,x)=>s+x*x,0));
  return out.map(x => x/(norm||1));
}

export async function getEmbedding(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
  if (!key) return deterministic(text);
  try {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ input: text, model })
    });
    if (!resp.ok) throw new Error('OpenAI '+resp.status);
    const js = await resp.json();
    const vec = js?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== DIMS) throw new Error('embedding inválido');
    return vec;
  } catch (e) {
    console.warn('[embeddings] fallback:', (e as Error).message);
    return deterministic(text);
  }
}
