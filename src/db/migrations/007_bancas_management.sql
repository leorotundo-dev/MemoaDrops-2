CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de bancas
CREATE TABLE IF NOT EXISTS bancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  website_url TEXT,
  logo_url TEXT,
  description TEXT,
  areas JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  scraper_id UUID REFERENCES scrapers(id) ON DELETE SET NULL,
  total_contests INTEGER DEFAULT 0,
  last_contest_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de estatísticas por ano
CREATE TABLE IF NOT EXISTS banca_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banca_id UUID REFERENCES bancas(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_contests INTEGER DEFAULT 0,
  total_candidates INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(banca_id, year)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bancas_active ON bancas(is_active);
CREATE INDEX IF NOT EXISTS idx_bancas_name ON bancas(name);
CREATE INDEX IF NOT EXISTS idx_banca_stats_banca_id ON banca_stats(banca_id);

-- Seeds (principais bancas)
INSERT INTO bancas (name, display_name, short_name, website_url, description, areas) VALUES
 ('cebraspe', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção e de Promoção de Eventos', 'Cebraspe', 'https://www.cebraspe.org.br/', 'Antiga CESPE/UnB, uma das maiores bancas do Brasil', '["federal","estadual","municipal"]'),
 ('fgv', 'Fundação Getúlio Vargas', 'FGV', 'https://www.fgv.br/', 'Banca de renome nacional, conhecida por questões discursivas', '["federal","estadual"]'),
 ('vunesp', 'Fundação para o Vestibular da Universidade Estadual Paulista', 'Vunesp', 'https://www.vunesp.com.br/', 'Principal banca de São Paulo', '["estadual","municipal"]'),
 ('fcc', 'Fundação Carlos Chagas', 'FCC', 'https://www.fcc.org.br/', 'Uma das bancas mais tradicionais do Brasil', '["federal","estadual","municipal"]'),
 ('ibfc', 'Instituto Brasileiro de Formação e Capacitação', 'IBFC', 'https://www.ibfc.org.br/', 'Banca com atuação em diversos estados', '["federal","estadual","municipal"]'),
 ('aocp', 'Associação dos Oficiais da Polícia Militar do Estado de São Paulo', 'AOCP', NULL, 'Banca com forte presença na área policial', '["estadual","municipal"]'),
 ('idecan', 'Instituto de Desenvolvimento Educacional, Cultural e Assistencial Nacional', 'Idecan', 'https://www.idecan.org.br/', 'Banca com atuação nacional', '["federal","estadual","municipal"]'),
 ('quadrix', 'Quadrix', 'Quadrix', 'https://www.quadrix.org.br/', 'Banca em crescimento nos últimos anos', '["federal","estadual"]'),
 ('funrio', 'Fundação de Apoio à Pesquisa, Ensino e Assistência', 'Funrio', NULL, 'Banca do Rio de Janeiro', '["federal","estadual"]'),
 ('fundatec', 'Fundação Universidade Empresa de Tecnologia e Ciências', 'Fundatec', 'https://www.fundatec.org.br/', 'Principal banca do Rio Grande do Sul', '["estadual","municipal"]'),
 ('consulplan', 'Consulplan', 'Consulplan', 'https://www.consulplan.net/', 'Banca com atuação em diversos estados', '["federal","estadual","municipal"]'),
 ('ibade', 'Instituto Brasileiro de Apoio e Desenvolvimento Executivo', 'Ibade', 'https://www.ibade.org.br/', 'Banca do Rio de Janeiro', '["estadual","municipal"]')
ON CONFLICT (name) DO NOTHING;
