import 'dotenv/config';
import { pool } from '../db/connection.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Create user
    const u = await client.query(
      "INSERT INTO users(email, name) VALUES ($1,$2) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id, email",
      ['demo@memodrops.com', 'Demo User']
    );
    const userId = u.rows[0].id;

    // Create deck
    const d = await client.query(
      "INSERT INTO decks(user_id, title, description) VALUES ($1,$2,$3) RETURNING id",
      [userId, 'Português — Demo', 'Deck de demonstração com 3 cards']
    );
    const deckId = d.rows[0].id;

    // Create 3 cards
    const cards = [
      { front: 'O que é sujeito composto?', back: 'Sujeito com dois ou mais núcleos ligados por e ou, por exemplo.' },
      { front: 'Emprego da crase: quando ocorre?', back: 'Quando há fusão da preposição a com o artigo a(s), ex: Vou à escola.' },
      { front: 'Plural de cidadão?', back: 'Cidadãos (pt-BR moderno).' },
    ];
    for (const c of cards) {
      await client.query(
        "INSERT INTO cards(deck_id, front, back, next_review_date) VALUES ($1,$2,$3, CURRENT_DATE)",
        [deckId, c.front, c.back]
      );
    }
    await client.query('COMMIT');
    console.log('Seed OK:');
    console.log({ userId, deckId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
