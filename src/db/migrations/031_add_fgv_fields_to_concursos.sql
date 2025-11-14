-- Migration 031: Adicionar campos para integração FGV
-- Adiciona campos necessários para armazenar dados dos concursos FGV

-- Adicionar campos se não existirem
DO $$ 
BEGIN
  -- Status do concurso
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='status'
  ) THEN
    ALTER TABLE concursos ADD COLUMN status VARCHAR(50);
  END IF;
  
  -- Descrição
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='descricao'
  ) THEN
    ALTER TABLE concursos ADD COLUMN descricao TEXT;
  END IF;
  
  -- Email de contato
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='email'
  ) THEN
    ALTER TABLE concursos ADD COLUMN email VARCHAR(255);
  END IF;
  
  -- Telefone de contato
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='telefone'
  ) THEN
    ALTER TABLE concursos ADD COLUMN telefone VARCHAR(50);
  END IF;
  
  -- URL da fonte (site da banca)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='fonte_url'
  ) THEN
    ALTER TABLE concursos ADD COLUMN fonte_url TEXT;
  END IF;
  
  -- Total de arquivos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='total_arquivos'
  ) THEN
    ALTER TABLE concursos ADD COLUMN total_arquivos INTEGER DEFAULT 0;
  END IF;
  
  -- Total de questões
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='total_questoes'
  ) THEN
    ALTER TABLE concursos ADD COLUMN total_questoes INTEGER DEFAULT 0;
  END IF;
  
  -- Data do scraping
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='scraped_at'
  ) THEN
    ALTER TABLE concursos ADD COLUMN scraped_at TIMESTAMP;
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_concursos_status ON concursos(status);
CREATE INDEX IF NOT EXISTS idx_concursos_scraped_at ON concursos(scraped_at);

-- Comentários
COMMENT ON COLUMN concursos.status IS 'Status do concurso (Em Andamento, Realizado, Cancelado)';
COMMENT ON COLUMN concursos.descricao IS 'Descrição completa do concurso';
COMMENT ON COLUMN concursos.email IS 'Email de contato do concurso';
COMMENT ON COLUMN concursos.telefone IS 'Telefone de contato do concurso';
COMMENT ON COLUMN concursos.fonte_url IS 'URL da página do concurso no site da banca';
COMMENT ON COLUMN concursos.total_arquivos IS 'Total de arquivos (PDFs, editais, provas) catalogados';
COMMENT ON COLUMN concursos.total_questoes IS 'Total de questões extraídas dos PDFs';
COMMENT ON COLUMN concursos.scraped_at IS 'Data/hora da última coleta de dados via scraping';
