-- Migration 004: Adicionar tabelas faltantes e sistema de custos

-- Tabela de concursos (se não existir)
CREATE TABLE IF NOT EXISTS concursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  banca VARCHAR(255),
  ano INTEGER,
  nivel VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de matérias (se não existir)
CREATE TABLE IF NOT EXISTS materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de sessões de estudo (se não existir)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  cards_reviewed INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, created_at);

-- Tabela de jobs (se não existir)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'waiting',
  data JSONB,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Tabela de custos de APIs e infraestrutura
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL, -- 'openai', 'railway', 'vercel', 'database', etc
  category VARCHAR(50) NOT NULL, -- 'ai', 'hosting', 'database', 'storage'
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  description TEXT,
  usage_details JSONB, -- { tokens: 1000, requests: 50, etc }
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_costs_service ON api_costs(service);
CREATE INDEX IF NOT EXISTS idx_api_costs_period ON api_costs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_api_costs_category ON api_costs(category);

-- Tabela de uso de APIs (para rastreamento em tempo real)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 4) DEFAULT 0,
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_service_date ON api_usage(service, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id);

-- Inserir custos de exemplo (últimos 30 dias)
INSERT INTO api_costs (service, category, amount, description, period_start, period_end, usage_details)
VALUES 
  ('openai', 'ai', 45.50, 'GPT-4 API usage', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '{"tokens": 150000, "requests": 1200}'::jsonb),
  ('railway', 'hosting', 25.00, 'Backend hosting', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '{"hours": 720}'::jsonb),
  ('vercel', 'hosting', 0.00, 'Frontend hosting (free tier)', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '{"bandwidth_gb": 50}'::jsonb),
  ('railway', 'database', 15.00, 'PostgreSQL database', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '{"storage_gb": 5}'::jsonb)
ON CONFLICT DO NOTHING;

-- Adicionar coluna cash_balance na tabela users se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cash_balance') THEN
    ALTER TABLE users ADD COLUMN cash_balance DECIMAL(10, 2) DEFAULT 0;
  END IF;
  
  -- Renomear cash para cash_balance se existir
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cash') THEN
    ALTER TABLE users RENAME COLUMN cash TO cash_balance;
  END IF;
END $$;

COMMENT ON TABLE api_costs IS 'Rastreamento de custos mensais de APIs e infraestrutura';
COMMENT ON TABLE api_usage IS 'Log de uso de APIs em tempo real para cálculo de custos estimados';
