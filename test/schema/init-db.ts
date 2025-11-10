import { initSchema } from '../__mocks__/db/connection';

export async function initTestDb() {
  await initSchema(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS decks (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY,
      deck_id UUID NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      repetitions INT DEFAULT 0,
      ease_factor REAL DEFAULT 2.5,
      interval INT DEFAULT 0,
      next_review_date DATE DEFAULT CURRENT_DATE,
      embedding JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY,
      card_id UUID NOT NULL,
      rating INT NOT NULL,
      reviewed_at TIMESTAMPTZ DEFAULT now()
    );

    -- Minimal FKs (pg-mem handles constraints)
    -- Note: In pg-mem, you can add constraints, but for tests we keep it light.
    -- gen_random_uuid() and now() are registered in the mock connection
  `);
}
