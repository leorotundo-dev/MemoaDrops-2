-- Migration 048: Adicionar campos detalhados para concursos
-- Adiciona campos necessários para exibir informações completas na página de concurso

DO $$ 
BEGIN
  -- Ano do concurso
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='ano'
  ) THEN
    ALTER TABLE concursos ADD COLUMN ano INTEGER;
  END IF;
  
  -- Nível do concurso (fundamental, médio, superior)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='nivel'
  ) THEN
    ALTER TABLE concursos ADD COLUMN nivel VARCHAR(50);
  END IF;
  
  -- Órgão contratante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='orgao'
  ) THEN
    ALTER TABLE concursos ADD COLUMN orgao TEXT;
  END IF;
  
  -- Estado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='estado'
  ) THEN
    ALTER TABLE concursos ADD COLUMN estado VARCHAR(2);
  END IF;
  
  -- Cidade
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='cidade'
  ) THEN
    ALTER TABLE concursos ADD COLUMN cidade VARCHAR(255);
  END IF;
  
  -- Número de vagas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='numero_vagas'
  ) THEN
    ALTER TABLE concursos ADD COLUMN numero_vagas INTEGER;
  END IF;
  
  -- Salário mínimo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='salario'
  ) THEN
    ALTER TABLE concursos ADD COLUMN salario DECIMAL(10,2);
  END IF;
  
  -- Salário máximo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='salario_max'
  ) THEN
    ALTER TABLE concursos ADD COLUMN salario_max DECIMAL(10,2);
  END IF;
  
  -- Data de início das inscrições
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='data_inscricao_inicio'
  ) THEN
    ALTER TABLE concursos ADD COLUMN data_inscricao_inicio DATE;
  END IF;
  
  -- Data de fim das inscrições
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='data_inscricao_fim'
  ) THEN
    ALTER TABLE concursos ADD COLUMN data_inscricao_fim DATE;
  END IF;
  
  -- Data da prova
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='data_prova'
  ) THEN
    ALTER TABLE concursos ADD COLUMN data_prova DATE;
  END IF;
  
  -- Data do resultado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='data_resultado'
  ) THEN
    ALTER TABLE concursos ADD COLUMN data_resultado DATE;
  END IF;
  
  -- URL do edital
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='edital_url'
  ) THEN
    ALTER TABLE concursos ADD COLUMN edital_url TEXT;
  END IF;
  
  -- URL do site oficial
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='site_oficial_url'
  ) THEN
    ALTER TABLE concursos ADD COLUMN site_oficial_url TEXT;
  END IF;
  
  -- URL de inscrições
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='inscricoes_url'
  ) THEN
    ALTER TABLE concursos ADD COLUMN inscricoes_url TEXT;
  END IF;
  
  -- URL do concurso (se não existir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='contest_url'
  ) THEN
    ALTER TABLE concursos ADD COLUMN contest_url TEXT;
  END IF;
  
  -- Informações adicionais do scraper (JSON)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='informacoes_scraper'
  ) THEN
    ALTER TABLE concursos ADD COLUMN informacoes_scraper JSONB;
  END IF;
  
END $$;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_concursos_ano ON concursos(ano);
CREATE INDEX IF NOT EXISTS idx_concursos_nivel ON concursos(nivel);
CREATE INDEX IF NOT EXISTS idx_concursos_estado ON concursos(estado);
CREATE INDEX IF NOT EXISTS idx_concursos_cidade ON concursos(cidade);
CREATE INDEX IF NOT EXISTS idx_concursos_data_inscricao_fim ON concursos(data_inscricao_fim);
CREATE INDEX IF NOT EXISTS idx_concursos_data_prova ON concursos(data_prova);

-- Comentários
COMMENT ON COLUMN concursos.ano IS 'Ano do concurso';
COMMENT ON COLUMN concursos.nivel IS 'Nível de escolaridade exigido (fundamental, médio, superior)';
COMMENT ON COLUMN concursos.orgao IS 'Órgão ou instituição contratante';
COMMENT ON COLUMN concursos.estado IS 'Sigla do estado (UF)';
COMMENT ON COLUMN concursos.cidade IS 'Cidade onde será realizado o concurso';
COMMENT ON COLUMN concursos.numero_vagas IS 'Total de vagas oferecidas';
COMMENT ON COLUMN concursos.salario IS 'Salário mínimo oferecido';
COMMENT ON COLUMN concursos.salario_max IS 'Salário máximo oferecido';
COMMENT ON COLUMN concursos.data_inscricao_inicio IS 'Data de início das inscrições';
COMMENT ON COLUMN concursos.data_inscricao_fim IS 'Data de fim das inscrições';
COMMENT ON COLUMN concursos.data_prova IS 'Data prevista para realização da prova';
COMMENT ON COLUMN concursos.data_resultado IS 'Data prevista para divulgação do resultado';
COMMENT ON COLUMN concursos.edital_url IS 'URL do edital em PDF';
COMMENT ON COLUMN concursos.site_oficial_url IS 'URL do site oficial do concurso';
COMMENT ON COLUMN concursos.inscricoes_url IS 'URL para realizar inscrição';
COMMENT ON COLUMN concursos.contest_url IS 'URL da página do concurso no site da banca';
COMMENT ON COLUMN concursos.informacoes_scraper IS 'Informações adicionais coletadas pelo scraper (JSON)';
