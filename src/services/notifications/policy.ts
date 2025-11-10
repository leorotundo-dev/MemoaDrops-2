import { pool } from '../../db/connection.js';

export type UserPrefs = {
  push_enabled: boolean;
  study_reminders: boolean;
  news_updates: boolean;
  marketing_optin: boolean;
  timezone: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export async function getUserPrefs(userId: string): Promise<UserPrefs>{
  const { rows } = await pool.query('SELECT * FROM user_preferences WHERE user_id=$1', [userId]);
  if (!rows[0]) {
    const ins = await pool.query('INSERT INTO user_preferences(user_id) VALUES ($1) RETURNING *', [userId]);
    return ins.rows[0];
  }
  return rows[0];
}

function timeToMinutes(t: string){ const [h,m] = t.split(':').map(Number); return h*60+m; }

export function isWithinQuietHours(nowLocalHHmm: string, start: string | null, end: string | null): boolean{
  if (!start || !end) return false;
  const now = timeToMinutes(nowLocalHHmm);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return s <= e ? (now >= s && now <= e) : (now >= s || now <= e);
}

export async function shouldSendForUser(userId: string, type: 'study'|'news'|'marketing', nowLocalHHmm: string): Promise<boolean>{
  const p = await getUserPrefs(userId);
  if (!p.push_enabled) return false;
  if (isWithinQuietHours(nowLocalHHmm, p.quiet_hours_start, p.quiet_hours_end)) return false;
  if (type === 'study') return p.study_reminders;
  if (type === 'news') return p.news_updates;
  if (type === 'marketing') return p.marketing_optin;
  return true;
}
