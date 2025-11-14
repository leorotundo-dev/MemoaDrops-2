-- Migration 035: Criar tabela de tópicos
-- Armazena tópicos e subtópicos de matérias (hierarquia)

CREATE TABLE IF NOT EXISTS topicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  
  -- Identificação
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Hierarquia (self-referencing)
  parent_id UUID REFERENCES topicos(id) ON DELETE CASCADE,
  nivel INTEGER DEFAULT 1,  -- 1=tópico, 2=subtópico, 3=sub-subtópico
  ordem INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_topicos_materia ON topicos(materia_id);
CREATE INDEX IF NOT EXISTS idx_topicos_parent ON topicos(parent_id);
CREATE INDEX IF NOT EXISTS idx_topicos_nivel ON topicos(nivel);
CREATE INDEX IF NOT EXISTS idx_topicos_slug ON topicos(slug);
CREATE INDEX IF NOT EXISTS idx_topicos_ordem ON topicos(materia_id, ordem);

-- Constraint: slug único por matéria
CREATE UNIQUE INDEX IF NOT EXISTS idx_topicos_slug_materia ON topicos(materia_id, slug);

-- Comentários
COMMENT ON TABLE topicos IS 'Tópicos e subtópicos de matérias (hierarquia)';
COMMENT ON COLUMN topicos.parent_id IS 'ID do tópico pai (NULL para tópicos raiz)';
COMMENT ON COLUMN topicos.nivel IS 'Nível na hierarquia (1=tópico, 2=subtópico, 3=sub-subtópico)';
COMMENT ON COLUMN topicos.ordem IS 'Ordem de exibição dentro da matéria ou tópico pai';
