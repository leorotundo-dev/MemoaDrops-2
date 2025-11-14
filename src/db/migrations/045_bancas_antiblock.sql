-- Migration 045: Anti-Block e Compliance para Scrapers
-- Adiciona tabelas para gestão de bloqueios e métricas de scraping

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de revisões manuais (quando scraper é bloqueado)
CREATE TABLE IF NOT EXISTS manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banca_id INTEGER REFERENCES bancas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  reason TEXT NOT NULL,      -- 'captcha','blocked','forbidden','waf','timeout'
  status TEXT NOT NULL DEFAULT 'open', -- 'open','ignored','resolved'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_manual_reviews_banca ON manual_reviews(banca_id);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_status ON manual_reviews(status);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_created ON manual_reviews(created_at DESC);

-- Tabela de contadores por domínio (métricas de scraping)
CREATE TABLE IF NOT EXISTS domain_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
  ok_count INTEGER DEFAULT 0,
  err_4xx_count INTEGER DEFAULT 0,
  err_5xx_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  bytes_downloaded BIGINT DEFAULT 0,
  requests_total INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,  -- HTTP 304
  UNIQUE(domain, window_start)
);

CREATE INDEX IF NOT EXISTS idx_domain_counters_domain ON domain_counters(domain);
CREATE INDEX IF NOT EXISTS idx_domain_counters_window ON domain_counters(window_start DESC);

-- Tabela de atualizações de concursos (tracking de mudanças)
CREATE TABLE IF NOT EXISTS contest_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banca_id INTEGER REFERENCES bancas(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT,
  changed_fields JSONB,  -- campos que mudaram
  previous_hash TEXT,    -- hash do estado anterior
  current_hash TEXT,     -- hash do estado atual
  discovered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contest_updates_banca ON contest_updates(banca_id);
CREATE INDEX IF NOT EXISTS idx_contest_updates_external ON contest_updates(external_id);
CREATE INDEX IF NOT EXISTS idx_contest_updates_discovered ON contest_updates(discovered_at DESC);

-- View de alertas por domínio (últimas 24h)
CREATE OR REPLACE VIEW v_domain_alerts AS
SELECT 
  domain,
  SUM(ok_count) AS total_ok,
  SUM(err_4xx_count) AS total_4xx,
  SUM(err_5xx_count) AS total_5xx,
  SUM(blocked_count) AS total_blocked,
  SUM(bytes_downloaded) AS total_bytes,
  SUM(requests_total) AS total_requests,
  SUM(cache_hits) AS total_cache_hits,
  ROUND(100.0 * SUM(cache_hits) / NULLIF(SUM(requests_total), 0), 2) AS cache_hit_rate,
  MAX(window_start) AS last_activity
FROM domain_counters
WHERE window_start >= now() - interval '24 hours'
GROUP BY domain
ORDER BY total_blocked DESC, total_requests DESC;

COMMENT ON TABLE manual_reviews IS 'Fila de revisão manual para URLs bloqueadas ou com CAPTCHA';
COMMENT ON TABLE domain_counters IS 'Métricas de scraping por domínio e janela de tempo';
COMMENT ON TABLE contest_updates IS 'Histórico de mudanças detectadas em concursos';
COMMENT ON VIEW v_domain_alerts IS 'Alertas e métricas agregadas por domínio (últimas 24h)';
