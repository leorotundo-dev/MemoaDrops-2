-- Migration 005: Bancas e Scrapers
-- Criação de tabelas para gerenciar bancas organizadoras e scrapers de questões

-- Tabela de bancas organizadoras
CREATE TABLE IF NOT EXISTS bancas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(500),
  acronym VARCHAR(50),
  area VARCHAR(50), -- federal, estadual, municipal
  description TEXT,
  website VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  total_contests INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para bancas
CREATE INDEX IF NOT EXISTS idx_bancas_name ON bancas(name);
CREATE INDEX IF NOT EXISTS idx_bancas_area ON bancas(area);
CREATE INDEX IF NOT EXISTS idx_bancas_active ON bancas(is_active);

-- Tabela de scrapers
CREATE TABLE IF NOT EXISTS scrapers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  category VARCHAR(100), -- questoes, provas, gabaritos, etc
  banca_id INTEGER REFERENCES bancas(id) ON DELETE SET NULL,
  selectors JSONB, -- Seletores CSS/XPath para scraping
  config JSONB, -- Configurações adicionais (headers, auth, etc)
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  last_run_success BOOLEAN,
  last_error TEXT,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para scrapers
CREATE INDEX IF NOT EXISTS idx_scrapers_banca ON scrapers(banca_id);
CREATE INDEX IF NOT EXISTS idx_scrapers_category ON scrapers(category);
CREATE INDEX IF NOT EXISTS idx_scrapers_active ON scrapers(is_active);

-- Tabela de logs de scraper
CREATE TABLE IF NOT EXISTS scraper_logs (
  id SERIAL PRIMARY KEY,
  scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
  status VARCHAR(50), -- success, error, warning
  message TEXT,
  items_found INTEGER DEFAULT 0,
  items_saved INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_scraper_logs_scraper ON scraper_logs(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_status ON scraper_logs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_created ON scraper_logs(created_at DESC);

-- Tabela de execuções de scraper (histórico)
CREATE TABLE IF NOT EXISTS scraper_runs (
  id SERIAL PRIMARY KEY,
  scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  status VARCHAR(50), -- running, completed, failed
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- Índices para runs
CREATE INDEX IF NOT EXISTS idx_scraper_runs_scraper ON scraper_runs(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started ON scraper_runs(started_at DESC);

-- Comentários
COMMENT ON TABLE bancas IS 'Bancas organizadoras de concursos públicos';
COMMENT ON TABLE scrapers IS 'Scrapers para coletar questões e provas';
COMMENT ON TABLE scraper_logs IS 'Logs de execução dos scrapers';
COMMENT ON TABLE scraper_runs IS 'Histórico de execuções dos scrapers';
