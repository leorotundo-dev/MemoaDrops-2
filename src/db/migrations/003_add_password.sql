
-- Adicionar campo de senha e índice de email (idempotente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
