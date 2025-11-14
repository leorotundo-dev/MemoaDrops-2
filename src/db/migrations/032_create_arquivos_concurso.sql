-- Migration 032: Criar tabela de arquivos de concursos
-- Armazena PDFs, editais, provas, gabaritos, resultados, etc

CREATE TABLE IF NOT EXISTS arquivos_concurso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  
  -- Metadados do arquivo
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo VARCHAR(50),  -- pdf, doc, link
  categoria VARCHAR(100),  -- edital, prova, gabarito, resultado, retificacao, inscricao, recurso
  
  -- Específico para provas
  bloco_tematico VARCHAR(100),  -- "Bloco 1", "Bloco 2", etc
  tipo_prova INTEGER,  -- 1, 2, 3, 4 (versões diferentes)
  area_conhecimento VARCHAR(255),  -- "Seguridade Social", "Cultura e Educação"
  
  -- Controle de processamento
  data_publicacao DATE,
  tamanho_bytes BIGINT,
  hash_md5 VARCHAR(32),  -- Para detectar duplicatas
  processado BOOLEAN DEFAULT false,
  processado_at TIMESTAMP,
  erro_processamento TEXT,
  
  -- Metadados flexíveis
  metadata JSONB,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_arquivos_concurso_id ON arquivos_concurso(concurso_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_categoria ON arquivos_concurso(categoria);
CREATE INDEX IF NOT EXISTS idx_arquivos_bloco ON arquivos_concurso(bloco_tematico);
CREATE INDEX IF NOT EXISTS idx_arquivos_tipo_prova ON arquivos_concurso(tipo_prova);
CREATE INDEX IF NOT EXISTS idx_arquivos_processado ON arquivos_concurso(processado);
CREATE INDEX IF NOT EXISTS idx_arquivos_hash ON arquivos_concurso(hash_md5);
CREATE INDEX IF NOT EXISTS idx_arquivos_data_pub ON arquivos_concurso(data_publicacao DESC);

-- Constraint: URL única por concurso
CREATE UNIQUE INDEX IF NOT EXISTS idx_arquivos_url_unique ON arquivos_concurso(concurso_id, url);

-- Comentários
COMMENT ON TABLE arquivos_concurso IS 'Arquivos (PDFs, editais, provas, gabaritos) de concursos';
COMMENT ON COLUMN arquivos_concurso.titulo IS 'Título do arquivo (ex: "7ª Retificação", "Gabarito Oficial")';
COMMENT ON COLUMN arquivos_concurso.url IS 'URL completa do arquivo';
COMMENT ON COLUMN arquivos_concurso.categoria IS 'Categoria do arquivo (edital, prova, gabarito, resultado)';
COMMENT ON COLUMN arquivos_concurso.bloco_tematico IS 'Bloco temático da prova (se aplicável)';
COMMENT ON COLUMN arquivos_concurso.tipo_prova IS 'Tipo de prova (1, 2, 3, 4) para múltiplas versões';
COMMENT ON COLUMN arquivos_concurso.hash_md5 IS 'Hash MD5 do arquivo para detectar duplicatas';
COMMENT ON COLUMN arquivos_concurso.processado IS 'Indica se o arquivo já foi processado (questões extraídas)';
COMMENT ON COLUMN arquivos_concurso.metadata IS 'Metadados adicionais em formato JSON';
