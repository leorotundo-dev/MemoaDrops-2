-- Migration 037: Criar tabela de gabaritos
-- Armazena gabaritos oficiais (preliminares e definitivos) de provas

CREATE TABLE IF NOT EXISTS gabaritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id UUID NOT NULL REFERENCES arquivos_concurso(id) ON DELETE CASCADE,
  concurso_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  
  -- Identificação
  tipo VARCHAR(50) NOT NULL,  -- preliminar, definitivo
  bloco_tematico VARCHAR(100),
  tipo_prova INTEGER,
  
  -- Respostas (JSONB para flexibilidade)
  -- Formato: {"1": "A", "2": "C", "3": "B", ...}
  respostas JSONB NOT NULL,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gabaritos_arquivo ON gabaritos(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_gabaritos_concurso ON gabaritos(concurso_id);
CREATE INDEX IF NOT EXISTS idx_gabaritos_tipo ON gabaritos(tipo);
CREATE INDEX IF NOT EXISTS idx_gabaritos_bloco_prova ON gabaritos(bloco_tematico, tipo_prova);

-- Índice GIN para busca eficiente no JSONB
CREATE INDEX IF NOT EXISTS idx_gabaritos_respostas ON gabaritos USING gin(respostas);

-- Constraint: gabarito único por arquivo + tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_gabaritos_unique ON gabaritos(arquivo_id, tipo);

-- Comentários
COMMENT ON TABLE gabaritos IS 'Gabaritos oficiais (preliminares e definitivos) de provas';
COMMENT ON COLUMN gabaritos.tipo IS 'Tipo do gabarito (preliminar, definitivo)';
COMMENT ON COLUMN gabaritos.respostas IS 'Respostas em formato JSON: {"1": "A", "2": "C", ...}';
COMMENT ON COLUMN gabaritos.bloco_tematico IS 'Bloco temático da prova (se aplicável)';
COMMENT ON COLUMN gabaritos.tipo_prova IS 'Tipo de prova (1, 2, 3, 4) para múltiplas versões';
