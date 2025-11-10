import { pool } from '../test/__mocks__/db/connection';
import * as Users from '../src/services/usersService';

describe('usersService.getUserStats', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const d1 = '00000000-0000-0000-0000-00000000d001';
  const d2 = '00000000-0000-0000-0000-00000000d002';
  const c1 = '00000000-0000-0000-0000-00000000c001';
  const c2 = '00000000-0000-0000-0000-00000000c002';

  beforeAll(async () => {
    await pool.query(`INSERT INTO users (id, email, name) VALUES ($1, 'u@test.com', 'U')`, [userId]);
    await pool.query(`INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'D1'), ($3, $2, 'D2')`, [d1, userId, d2]);
    await pool.query(`INSERT INTO cards (id, deck_id, front, back, next_review_date) VALUES
      ($1, $3, 'Q1', 'A1', CURRENT_DATE - INTERVAL '1 day'),
      ($2, $4, 'Q2', 'A2', CURRENT_DATE + INTERVAL '1 day')`,
      [c1, c2, d1, d2]);
    await pool.query(`INSERT INTO reviews (id, card_id, rating, reviewed_at) VALUES
      ('00000000-0000-0000-0000-00000000r001', $1, 5, CURRENT_DATE),
      ('00000000-0000-0000-0000-00000000r002', $2, 3, CURRENT_DATE - INTERVAL '2 day')`, [c1, c2]);
  });

  it('retorna métricas agregadas básicas', async () => {
    const stats = await Users.getUserStats(userId);
    expect(stats.total_decks).toBe(2);
    expect(stats.total_cards).toBe(2);
    expect(stats.cards_due_today).toBe(1);
    expect(stats.total_reviews).toBe(2);
    expect(stats.cards_reviewed_today).toBe(1);
    expect(stats.last_study_date).toBeTruthy();
  });
});
