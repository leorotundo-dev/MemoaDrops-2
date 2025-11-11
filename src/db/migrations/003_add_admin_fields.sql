-- Adicionar campos necessários para o dashboard admin

-- Adicionar coluna role (superadmin, admin, moderator, user)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Adicionar coluna plan (free, premium, team)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- Adicionar coluna password_hash
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Adicionar coluna cash (créditos do usuário)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cash DECIMAL(10,2) DEFAULT 0.00;

-- Adicionar coluna is_banned
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Adicionar coluna updated_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Adicionar índice para role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Adicionar índice para plan
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Adicionar índice para is_banned
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
