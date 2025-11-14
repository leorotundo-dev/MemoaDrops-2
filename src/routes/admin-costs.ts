import type { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

type CostEvent = {
  provider: string;
  service: string;
  env: 'prod'|'stg'|'dev';
  feature: string;
  banca?: string|null;
  resource_id?: string|null;
  unit: string;
  quantity: number;
  currency?: string;
  unit_price?: number; // opcional se quiser forçar from rates
  meta?: any;
  ts?: string; // ISO opcional
};

async function getRate(provider:string, service:string, unit:string){
  const { rows } = await pool.query(`
    SELECT price_brl
    FROM provider_rates
    WHERE provider=$1 AND service=$2 AND unit=$3
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    ORDER BY valid_from DESC
    LIMIT 1
  `,[provider,service,unit]);
  return rows[0]?.price_brl as number | undefined;
}

// Exportamos para ser usado também por middlewares internos
export async function recordCostEvent(ev: CostEvent){
  const unit_price = ev.unit_price ?? await getRate(ev.provider, ev.service, ev.unit) ?? 0;
  const total = Number((Number(ev.quantity) * Number(unit_price)).toFixed(6));
  const currency = ev.currency || 'BRL';
  await pool.query(`
    INSERT INTO cost_events (ts, provider, service, env, feature, banca, resource_id, unit, quantity, currency, unit_price, total_cost, meta)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  `,[ev.ts || new Date().toISOString(), ev.provider, ev.service, ev.env, ev.feature,
     ev.banca||null, ev.resource_id||null, ev.unit, ev.quantity, currency, unit_price, total, ev.meta || {}]);
  return { total_brl: total, unit_price_brl: unit_price };
}

export async function registerAdminCosts(app: FastifyInstance){
  const auth = (app as any).authenticate || ((req:any,_res:any,done:any)=>done());

  // Ingestão manual de evento de custo
  app.post('/admin/costs/events', { preHandler:[auth] }, async (req:any, reply) => {
    const body = req.body as CostEvent;
    try{
      const res = await recordCostEvent(body);
      reply.send({ ok:true, ...res });
    }catch(e:any){
      reply.status(400).send({ ok:false, error: e?.message || String(e) });
    }
  });

  // Rates
  app.get('/admin/costs/rates', { preHandler:[auth] }, async (_req, reply) => {
    const { rows } = await pool.query(`SELECT * FROM provider_rates ORDER BY provider, service`);
    reply.send(rows);
  });
  app.put('/admin/costs/rates', { preHandler:[auth] }, async (req:any, reply) => {
    // sobrescreve/insere em lote
    const rows = req.body as Array<{provider:string,service:string,unit:string,price_brl:number,valid_from?:string,valid_to?:string|null}>;
    const client = await pool.connect();
    try{
      await client.query('BEGIN');
      for (const r of rows){
        await client.query(`
          INSERT INTO provider_rates (provider,service,unit,price_brl,valid_from,valid_to)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (provider,service,unit,valid_from) DO UPDATE SET price_brl=EXCLUDED.price_brl, valid_to=EXCLUDED.valid_to
        `,[r.provider, r.service, r.unit, r.price_brl, r.valid_from || new Date().toISOString().slice(0,10), r.valid_to || null]);
      }
      await client.query('COMMIT');
      reply.send({ ok:true, count: rows.length });
    }catch(e:any){
      await client.query('ROLLBACK');
      reply.status(400).send({ ok:false, error: e?.message||String(e) });
    }finally{
      client.release();
    }
  });

  // Overview (KPI + série diária)
  app.get('/admin/costs/overview', { preHandler:[auth] }, async (req:any, reply) => {
    const { from, to, env='prod' } = req.query || {};
    const args:any[] = [env];
    let where = `WHERE env = $1`;
    if (from){ args.push(from); where += ` AND ts >= $${args.length}`; }
    if (to){ args.push(to); where += ` AND ts < ($${args.length}+interval '1 day')`; }
    const kpiSql = `SELECT ROUND(SUM(total_cost)::numeric,2) AS total_brl FROM cost_events ${where}`;
    const seriesSql = `
      SELECT date_trunc('day', ts)::date AS dt, SUM(total_cost) AS brl
      FROM cost_events ${where}
      GROUP BY 1 ORDER BY 1
    `;
    const kpi = await pool.query(kpiSql, args);
    const series = await pool.query(seriesSql, args);
    reply.send({ total_brl: kpi.rows[0]?.total_brl || 0, series: series.rows });
  });

  // Breakdown por dimensão
  app.get('/admin/costs/breakdown', { preHandler:[auth] }, async (req:any, reply) => {
    const { from, to, env='prod', group='feature' } = req.query || {};
    const allowed = new Set(['feature','provider','service','banca']);
    const dim = allowed.has(group) ? group : 'feature';
    const args:any[] = [env];
    let where = `WHERE env = $1`;
    if (from){ args.push(from); where += ` AND ts >= $${args.length}`; }
    if (to){ args.push(to); where += ` AND ts < ($${args.length}+interval '1 day')`; }
    const { rows } = await pool.query(`
      SELECT ${dim} AS key, ROUND(SUM(total_cost)::numeric,2) AS brl, COUNT(*) AS events
      FROM cost_events ${where}
      GROUP BY 1 ORDER BY brl DESC
    `, args);
    reply.send(rows);
  });

  // Unit economics
  app.get('/admin/costs/unit', { preHandler:[auth] }, async (req:any, reply) => {
    const { from, to, env='prod', metric } = req.query || {};
    const args:any[] = [env];
    let where = `WHERE env = $1`;
    if (from){ args.push(from); where += ` AND ts >= $${args.length}`; }
    if (to){ args.push(to); where += ` AND ts < ($${args.length}+interval '1 day')`; }

    // Exemplos: custo por card (feature=gerar_deck), por concurso (harvester), por usuário ativo (join externo necessário)
    if (metric === 'cost_per_card'){
      const { rows:[r] } = await pool.query(`
        WITH c AS (SELECT SUM(total_cost) AS brl FROM cost_events ${where} AND feature='gerar_deck'),
             n AS (SELECT COUNT(*)::numeric AS qty FROM cards WHERE created_at >= COALESCE($2::date, date_trunc('day', now())-interval '30 days'))
        SELECT ROUND(c.brl / NULLIF(n.qty,0), 4) AS brl_per_card FROM c, n
      `, [...args, from || null])
      reply.send(r || { brl_per_card: 0 });
      return;
    }
    if (metric === 'cost_per_concurso'){
      const { rows:[r] } = await pool.query(`
        WITH c AS (SELECT SUM(total_cost) AS brl FROM cost_events ${where} AND feature='harvester'),
             n AS (SELECT COUNT(*)::numeric AS qty FROM contests WHERE created_at >= COALESCE($2::date, date_trunc('day', now())-interval '30 days'))
        SELECT ROUND(c.brl / NULLIF(n.qty,0), 4) AS brl_per_concurso FROM c, n
      `, [...args, from || null])
      reply.send(r || { brl_per_concurso: 0 });
      return;
    }
    // default: custo total
    const { rows:[r] } = await pool.query(`SELECT ROUND(SUM(total_cost)::numeric,4) AS total_brl FROM cost_events ${where}`, args);
    reply.send(r || { total_brl: 0 });
  });

  // Budgets e Alertas simples
  app.get('/admin/costs/alerts', { preHandler:[auth] }, async (_req:any, reply) => {
    const { rows } = await pool.query(`SELECT * FROM cost_alerts ORDER BY happened_at DESC LIMIT 100`);
    reply.send(rows);
  });
  app.post('/admin/costs/budgets', { preHandler:[auth] }, async (req:any, reply) => {
    const { scope, scope_key, period, amount_brl, notify_pct } = req.body || {};
    const { rows:[r] } = await pool.query(`
      INSERT INTO cost_budgets (scope, scope_key, period, amount_brl, notify_pct)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `,[scope, scope_key || null, period, amount_brl, notify_pct || [80,100,120]]);
    reply.send(r);
  });
}
