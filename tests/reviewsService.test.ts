import { pool } from '../test/__mocks__/db/connection';
import * as Reviews from '../src/services/reviewsService';

// Mock sm2Next for deterministic behaviour
jest.mock('../src/utils/sm2', () => ({
  sm2Next: () => ({ repetitions: 1, ease_factor: 2.6, interval: 1 })
}));

describe('reviewsService.reviewCard', () => {
  const cardId = '00000000-0000-0000-0000-00000000c001';
  const deckId = '00000000-0000-0000-0000-00000000d001';

  beforeAll(async () => {
    await pool.query(`INSERT INTO decks (id, user_id, title) VALUES ($1, $2, $3)`, [deckId, '00000000-0000-0000-0000-000000000001', 'Deck Teste']);
    await pool.query(`INSERT INTO cards (id, deck_id, front, back, repetitions, ease_factor, interval, next_review_date) 
                      VALUES ($1, $2, 'Q', 'A', 0, 2.5, 0, CURRENT_DATE)`, [cardId, deckId]);
  });

  it('atualiza estado SM-2 e insere review', async () => {
    const out = await Reviews.reviewCard(cardId, 5);
    expect(out.ok).toBe(true);
    expect(out.repetitions).toBe(1);
    expect(out.ease_factor).toBeCloseTo(2.6);
    expect(out.interval).toBe(1);

    const { rows: c } = await pool.query('SELECT repetitions, ease_factor, interval, next_review_date FROM cards WHERE id=$1', [cardId]);
    expect(c[0].repetitions).toBe(1);
    expect(Number(c[0].ease_factor)).toBeCloseTo(2.6);
    expect(c[0].interval).toBe(1);

    const { rows: r } = await pool.query('SELECT COUNT(*)::int AS n FROM reviews WHERE card_id=$1', [cardId]);
    expect(r[0].n).toBe(1);
  });
});
