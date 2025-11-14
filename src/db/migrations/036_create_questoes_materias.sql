-- Migration 036: Criar tabela de relacionamento questões-matérias
-- Relacionamento N:N entre questões e matérias/tópicos

CREATE TABLE IF NOT EXISTS questoes_materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  topico_id UUID REFERENCES topicos(id) ON DELETE SET NULL,
  
  -- Relevância (0.0 a 1.0)
  relevancia DECIMAL(3,2) DEFAULT 1.0,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_questoes_materias_questao ON questoes_materias(questao_id);
CREATE INDEX IF NOT EXISTS idx_questoes_materias_materia ON questoes_materias(materia_id);
CREATE INDEX IF NOT EXISTS idx_questoes_materias_topico ON questoes_materias(topico_id);
CREATE INDEX IF NOT EXISTS idx_questoes_materias_relevancia ON questoes_materias(relevancia DESC);

-- Constraint: relacionamento único
CREATE UNIQUE INDEX IF NOT EXISTS idx_questoes_materias_unique ON questoes_materias(questao_id, materia_id, topico_id);

-- Comentários
COMMENT ON TABLE questoes_materias IS 'Relacionamento N:N entre questões e matérias/tópicos';
COMMENT ON COLUMN questoes_materias.relevancia IS 'Relevância da matéria/tópico para a questão (0.0 a 1.0)';
COMMENT ON COLUMN questoes_materias.topico_id IS 'ID do tópico específico (opcional, pode ser NULL)';
