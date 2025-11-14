CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Eventos de custo
CREATE TABLE IF NOT EXISTS cost_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,          -- openai|gcp|railway|infra|cloudflare
  service TEXT NOT NULL,           -- ex: gpt-4o:input_token | playwright:minute | pg:storage_gb
  env TEXT NOT NULL,               -- prod|stg|dev
  feature TEXT NOT NULL,           -- tutor_inline|gerar_deck|validacao_ia|harvester|dashboard
  banca TEXT,                      -- opc: fgv|cebraspe|vunesp|...
  resource_id TEXT,                -- opc: job id, watcher id, request id
  unit TEXT NOT NULL,              -- tokens|requests|minutos|gb_out|gb_storage
  quantity NUMERIC(18,6) NOT NULL CHECK (quantity >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  unit_price NUMERIC(18,6) NOT NULL CHECK (unit_price >= 0),
  total_cost NUMERIC(18,6) NOT NULL,
  meta JSONB
);
CREATE INDEX IF NOT EXISTS idx_cost_events_ts ON cost_events(ts);
CREATE INDEX IF NOT EXISTS idx_cost_events_keys ON cost_events(provider, service, env, feature);

-- 2) Tarifas (fonte de verdade)
CREATE TABLE IF NOT EXISTS provider_rates (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  service TEXT NOT NULL,     -- granular (ex: gpt-4o:input_token)
  unit TEXT NOT NULL,
  price_brl NUMERIC(18,6) NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_rates ON provider_rates(provider, service, unit, valid_from);

-- 3) Agregados diários (materialização simples)
CREATE TABLE IF NOT EXISTS cost_daily (
  dt DATE NOT NULL,
  env TEXT NOT NULL,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  total_cost_brl NUMERIC(18,6) NOT NULL,
  qty NUMERIC(18,6),
  PRIMARY KEY (dt, env, feature, provider)
);

-- 4) Budgets e Alertas
CREATE TABLE IF NOT EXISTS cost_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,            -- global|feature|provider|banca
  scope_key TEXT,                 -- ex: "gerar_deck" | "openai"
  period TEXT NOT NULL,           -- monthly|weekly
  amount_brl NUMERIC(18,2) NOT NULL,
  notify_pct INT[] DEFAULT '{80,100,120}',
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  happened_at TIMESTAMPTZ DEFAULT now(),
  kind TEXT NOT NULL,             -- budget_threshold|anomaly
  scope TEXT NOT NULL,
  scope_key TEXT,
  details JSONB
);

-- Views auxiliares (opcional)
CREATE OR REPLACE VIEW v_cost_month AS
SELECT date_trunc('month', ts)::date AS month,
       env, feature, provider,
       SUM(total_cost) AS brl,
       COUNT(*) AS events
FROM cost_events
GROUP BY 1,2,3,4;

