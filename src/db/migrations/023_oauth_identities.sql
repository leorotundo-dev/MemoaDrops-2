CREATE TABLE IF NOT EXISTS oauth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google' | 'apple'
  subject TEXT NOT NULL,  -- sub do id_token
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider, subject)
);
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_identities(user_id);
