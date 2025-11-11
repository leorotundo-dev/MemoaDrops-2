import OpenAI from 'openai';
import { trackAPIUsage } from './cost-tracker.js';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GenerateOptions { userId?: string; endpoint?: string; temperature?: number; model?: string; }

export async function chatCompletion(messages: Array<{role:'system'|'user'|'assistant'; content:string}>, options?: GenerateOptions) {
  const model = options?.model || MODEL;
  const temperature = typeof options?.temperature === 'number' ? options!.temperature : 0.7;
  const response = await openai.chat.completions.create({ model, messages, temperature });
  const usage: any = (response as any).usage || {};
  await trackAPIUsage({
    service: 'openai',
    endpoint: options?.endpoint || 'chat.completions.create',
    userId: options?.userId,
    model,
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    requestData: { messageCount: messages.length },
    responseData: { id: (response as any).id, finish: response.choices?.[0]?.finish_reason }
  });
  return response;
}

export async function generateFlashcards(text: string, options?: GenerateOptions) {
  const response = await chatCompletion([{ role: 'user', content: text }], { ...options, endpoint: 'generateFlashcards' });
  return response.choices?.[0]?.message?.content ?? '';
}
