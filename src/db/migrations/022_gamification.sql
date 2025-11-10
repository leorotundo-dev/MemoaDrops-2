CREATE TABLE IF NOT EXISTS user_gamification (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INT DEFAULT 0,
  streak INT DEFAULT 0,
  last_review_date DATE
);
