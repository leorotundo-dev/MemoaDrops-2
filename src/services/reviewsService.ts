import { pool } from '../db/connection.js';
import { sm2Next } from '../utils/sm2.js';

export async function reviewCard(cardId: string, rating: 0|1|2|3|4|5) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT repetitions, ease_factor, interval FROM cards WHERE id=$1 FOR UPDATE', [cardId]);
    if (!rows[0]) throw new Error('card_not_found');
    const cur = rows[0] as { repetitions:number; ease_factor:number; interval:number };
    const next = sm2Next({ repetitions: cur.repetitions, ease_factor: cur.ease_factor, interval: cur.interval }, rating);
    const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + next.interval);
    await client.query(
      'UPDATE cards SET repetitions=$2, ease_factor=$3, interval=$4, next_review_date=$5 WHERE id=$1',
      [cardId, next.repetitions, next.ease_factor, next.interval, nextDate.toISOString().slice(0,10)]
    );
    await client.query('INSERT INTO reviews(card_id, rating) VALUES ($1,$2)', [cardId, rating]);
    await client.query('COMMIT');
    return { ok: true, state: next, next_review_date: nextDate.toISOString().slice(0,10) };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
