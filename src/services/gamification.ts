import { pool } from '../db/connection.js';

export async function addXP(userId: string, inc=10) {
  await pool.query(`
    INSERT INTO user_gamification(user_id, xp, streak, last_review_date)
    VALUES ($1, $2, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      xp = user_gamification.xp + EXCLUDED.xp,
      streak = CASE WHEN user_gamification.last_review_date = CURRENT_DATE - INTERVAL '1 day'
                    THEN user_gamification.streak + 1
                    WHEN user_gamification.last_review_date = CURRENT_DATE
                    THEN user_gamification.streak
                    ELSE 1 END,
      last_review_date = CURRENT_DATE
  `, [userId, inc]);
}
