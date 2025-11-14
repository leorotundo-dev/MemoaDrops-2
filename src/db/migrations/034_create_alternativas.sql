-- Migration 034: Criar tabela de alternativas
-- Armazena as alternativas (A, B, C, D, E) de cada questão

CREATE TABLE IF NOT EXISTS alternativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  
  -- Identificação
  letra VARCHAR(10) NOT NULL,  -- A, B, C, D, E
  ordem INTEGER NOT NULL,  -- 1, 2, 3, 4, 5
  
  -- Conteúdo
  texto TEXT NOT NULL,
  
  -- Metadados
  tem_imagem BOOLEAN DEFAULT false,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alternativas_questao ON alternativas(questao_id);
CREATE INDEX IF NOT EXISTS idx_alternativas_ordem ON alternativas(questao_id, ordem);

-- Constraint: letra única por questão
CREATE UNIQUE INDEX IF NOT EXISTS idx_alternativas_letra_questao ON alternativas(questao_id, letra);

-- Comentários
COMMENT ON TABLE alternativas IS 'Alternativas (A, B, C, D, E) de questões de múltipla escolha';
COMMENT ON COLUMN alternativas.letra IS 'Letra da alternativa (A, B, C, D, E)';
COMMENT ON COLUMN alternativas.ordem IS 'Ordem de exibição da alternativa (1, 2, 3, 4, 5)';
COMMENT ON COLUMN alternativas.texto IS 'Texto completo da alternativa';
