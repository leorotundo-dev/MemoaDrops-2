import { pool } from './db.js';

export async function bumpDomainCounter(domain:string, kind:'ok'|'4xx'|'5xx'|'blocked'){
  const client = await pool.connect();
  try{
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO domain_counters (domain, ok_count, err_4xx_count, err_5xx_count, blocked_count)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (domain, window_start) DO UPDATE
        SET ok_count = domain_counters.ok_count + EXCLUDED.ok_count,
            err_4xx_count = domain_counters.err_4xx_count + EXCLUDED.err_4xx_count,
            err_5xx_count = domain_counters.err_5xx_count + EXCLUDED.err_5xx_count,
            blocked_count = domain_counters.blocked_count + EXCLUDED.blocked_count;
    `,[domain, kind==='ok'?1:0, kind==='4xx'?1:0, kind==='5xx'?1:0, kind==='blocked'?1:0]);
    await client.query('COMMIT');
  }catch{
    await client.query('ROLLBACK');
  }finally{
    client.release();
  }
}
