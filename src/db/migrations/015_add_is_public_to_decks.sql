ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks(is_public);
