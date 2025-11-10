import { getEmbedding } from './embeddingsCore.js';
export async function embedText(t: string) { return getEmbedding(t); }
