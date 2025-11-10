CREATE TABLE IF NOT EXISTS user_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'pt-BR',
  theme TEXT DEFAULT 'system',
  notifications BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
