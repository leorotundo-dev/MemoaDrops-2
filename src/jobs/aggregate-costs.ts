import { pool } from '../db/connection.js';
export interface AggregatedItem { service: string; total_cost: number; total_tokens: number; total_requests: number; }
export async function aggregateMonthlyAPICosts(month?: Date): Promise<AggregatedItem[]> {
  const target = month || new Date();
  const startOfMonth = new Date(target.getFullYear(), target.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(target.getFullYear(), target.getMonth()+1, 0, 23, 59, 59);
  const results: AggregatedItem[] = [];
  try {
    const { rows } = await pool.query(
      `SELECT service, SUM(estimated_cost)::numeric AS total_cost, SUM(tokens_used)::bigint AS total_tokens, COUNT(*) AS total_requests
       FROM api_usage WHERE created_at >= $1 AND created_at <= $2 GROUP BY service`, [startOfMonth, endOfMonth]);
    for (const row of rows) {
      const total_cost = Number(row.total_cost); const total_tokens = Number(row.total_tokens); const total_requests = Number(row.total_requests); const service = String(row.service);
      await pool.query(
        `INSERT INTO api_costs (service, category, amount, currency, description, usage_details, period_start, period_end, cost_created_at)
         VALUES ($1,$2,$3,'BRL',$4,$5,$6,$7,NOW())`,
        [service, service==='openai'?'ai':'other', total_cost, `Aggregated usage ${startOfMonth.toISOString().slice(0,10)}→${endOfMonth.toISOString().slice(0,10)}`,
         JSON.stringify({ total_tokens, total_requests }), startOfMonth, endOfMonth]);
      results.push({ service, total_cost, total_tokens, total_requests });
    }
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate()-90);
    await pool.query('DELETE FROM api_usage WHERE created_at < $1', [ninetyDaysAgo]);
    return results;
  } catch (err) { console.error('[AGGREGATE] erro:', err); throw err; }
}
