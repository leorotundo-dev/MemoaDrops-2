-- Migration 046: Adicionar external_id em concursos para scrapers

-- Adicionar coluna external_id
ALTER TABLE concursos 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Criar índice único para (banca_id, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_concursos_banca_external 
ON concursos(banca_id, external_id) 
WHERE external_id IS NOT NULL;

-- Criar índice para busca rápida por external_id
CREATE INDEX IF NOT EXISTS idx_concursos_external_id 
ON concursos(external_id) 
WHERE external_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN concursos.external_id IS 'ID externo do concurso na fonte original (usado por scrapers)';
