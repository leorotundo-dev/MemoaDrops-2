-- Scrapers & Logs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scrapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'banca','federal','estadual','justica','municipal','outros'
  hostname_pattern VARCHAR(255) NOT NULL, -- regex ou string
  adapter_file VARCHAR(255) NOT NULL, -- caminho ex: 'bancas/cebraspe.ts'
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  description TEXT,
  test_url TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scraper_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_id UUID REFERENCES scrapers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'success','error','timeout'
  materias_found INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time INTEGER, -- ms
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrapers_category ON scrapers(category);
CREATE INDEX IF NOT EXISTS idx_scrapers_active ON scrapers(is_active);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_scraper_id ON scraper_logs(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_created_at ON scraper_logs(created_at);

-- Seeds básicos (idempotentes)
INSERT INTO scrapers (name, display_name, category, hostname_pattern, adapter_file, test_url)
VALUES
 ('dou', 'Diário Oficial da União', 'federal', 'in\.gov\.br', 'federal/dou.ts', 'https://www.in.gov.br/'),
 ('cebraspe', 'Cebraspe/CESPE', 'banca', 'cebraspe\.org\.br', 'bancas/cebraspe.ts', 'https://www.cebraspe.org.br/'),
 ('fgv', 'FGV', 'banca', 'fgv\.br', 'bancas/fgv.ts', 'https://www.fgv.br/'),
 ('vunesp', 'Vunesp', 'banca', 'vunesp\.com\.br', 'bancas/vunesp.ts', 'https://www.vunesp.com.br/'),
 ('trf', 'Tribunais Regionais Federais', 'justica', 'trf\d+\.jus\.br', 'justica/trf.ts', NULL),
 ('trt', 'Tribunais Regionais do Trabalho', 'justica', 'trt\d+\.jus\.br', 'justica/trt.ts', NULL)
ON CONFLICT (name) DO NOTHING;
