import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small"; // 1536 dims

if (!apiKey) {
  console.warn("[embeddings] OPENAI_API_KEY not set. Throwing at runtime to avoid silent fallback.");
}

const client = new OpenAI({ apiKey });

/**
 * Gera embedding 1536-d usando OpenAI (text-embedding-3-small por padrão).
 * Lança erro se a env não estiver configurada.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return Array(1536).fill(0);

  const res = await client.embeddings.create({
    model,
    input: cleaned
  });
  const vec = res.data[0].embedding;
  if (!Array.isArray(vec)) throw new Error("Invalid embedding response");
  if (vec.length != 1536) {
    console.warn(`[embeddings] Got dimension ${vec.length}. Your DB column is VECTOR(1536).`);
  }
  return vec;
}
