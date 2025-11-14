-- Migration 044: Adicionar suporte a drops gerados de subtópicos
-- Data: 2025-11-14

-- Adicionar coluna subtopico_id (opcional, pois drops podem vir de questões OU subtópicos)
ALTER TABLE drops 
ADD COLUMN IF NOT EXISTS subtopico_id UUID REFERENCES subtopicos(id) ON DELETE CASCADE;

-- Adicionar colunas de rastreamento de origem
ALTER TABLE drops
ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'questao',  -- 'questao' ou 'subtopico'
ADD COLUMN IF NOT EXISTS fontes_utilizadas JSONB DEFAULT '[]'::jsonb;

-- Tornar questao_id opcional (pois agora pode vir de subtópico)
ALTER TABLE drops
ALTER COLUMN questao_id DROP NOT NULL;

-- Adicionar constraint: drop deve ter questao_id OU subtopico_id
ALTER TABLE drops
ADD CONSTRAINT drops_origem_check 
CHECK (
  (questao_id IS NOT NULL AND subtopico_id IS NULL) OR
  (questao_id IS NULL AND subtopico_id IS NOT NULL)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_drops_subtopico ON drops(subtopico_id);
CREATE INDEX IF NOT EXISTS idx_drops_origem ON drops(origem);

-- Comentários
COMMENT ON COLUMN drops.subtopico_id IS 'Subtópico de origem (quando gerado de edital)';
COMMENT ON COLUMN drops.origem IS 'Origem do drop: questao ou subtopico';
COMMENT ON COLUMN drops.fontes_utilizadas IS 'Array JSON com URLs das fontes utilizadas na geração';
