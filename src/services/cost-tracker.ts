import { pool } from '../db/connection.js';
type PricingMap = Record<string, { input: number; output: number }>;
const PRICING: PricingMap = {
  'gpt-4':        { input: 0.03,  output: 0.06  },
  'gpt-4-turbo':  { input: 0.01,  output: 0.03  },
  'gpt-3.5-turbo':{ input: 0.0015,output: 0.002 }
};
const DEFAULT_MODEL = 'gpt-3.5-turbo';
const USD_TO_BRL = Number(process.env.USD_TO_BRL || '5.00');

export interface TrackUsageParams {
  service: string;
  endpoint?: string;
  userId?: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  requestData?: any;
  responseData?: any;
}
export function estimateCostBRL(model: string, tokensInput: number, tokensOutput: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING[DEFAULT_MODEL];
  const costUSD = (tokensInput/1000)*pricing.input + (tokensOutput/1000)*pricing.output;
  return costUSD * USD_TO_BRL;
}
export async function trackAPIUsage(params: TrackUsageParams): Promise<void> {
  const { service, endpoint, userId, model, tokensInput, tokensOutput, requestData, responseData } = params;
  const estimatedCostBRL = estimateCostBRL(model, tokensInput, tokensOutput);
  try {
    await pool.query(
      `INSERT INTO api_usage (service, endpoint, user_id, tokens_used, estimated_cost, request_data, response_data, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [service, endpoint || null, userId || null, (tokensInput||0)+(tokensOutput||0), estimatedCostBRL,
       requestData? JSON.stringify(requestData).slice(0,2000): null,
       responseData? JSON.stringify(responseData).slice(0,2000): null]
    );
    console.log(`[COST] ${service}:${endpoint || '-'} model=${model} tokens=${(tokensInput||0)+(tokensOutput||0)} cost=R$ ${estimatedCostBRL.toFixed(4)}`);
  } catch (err) { console.error('[COST] erro ao salvar uso:', err); }
}
