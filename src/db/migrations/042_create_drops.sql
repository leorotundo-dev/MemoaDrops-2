-- Migration 042: Criar tabela de Drops (Pílulas de Conhecimento)
-- Armazena o conteúdo didático reformulado a partir de questões

CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  
  -- Identificação
  titulo VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  
  -- Conteúdo didático
  conteudo TEXT NOT NULL,  -- Conteúdo principal reformulado
  exemplo_pratico TEXT,    -- Exemplo de aplicação prática
  
  -- Técnicas de memorização (JSON array)
  tecnicas_memorizacao JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  dificuldade VARCHAR(50),  -- facil, medio, dificil
  tempo_estimado_minutos INTEGER DEFAULT 5,
  
  -- Relacionamentos (denormalizados para performance)
  materia_id UUID REFERENCES materias(id) ON DELETE SET NULL,
  topico_id UUID REFERENCES topicos(id) ON DELETE SET NULL,
  concurso_id UUID REFERENCES concursos(id) ON DELETE CASCADE,
  
  -- Auditoria
  gerado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_drops_questao ON drops(questao_id);
CREATE INDEX IF NOT EXISTS idx_drops_materia ON drops(materia_id);
CREATE INDEX IF NOT EXISTS idx_drops_topico ON drops(topico_id);
CREATE INDEX IF NOT EXISTS idx_drops_concurso ON drops(concurso_id);
CREATE INDEX IF NOT EXISTS idx_drops_dificuldade ON drops(dificuldade);
CREATE INDEX IF NOT EXISTS idx_drops_slug ON drops(slug);

-- Constraint: questão pode ter apenas 1 drop
CREATE UNIQUE INDEX IF NOT EXISTS idx_drops_questao_unique ON drops(questao_id);

-- Comentários
COMMENT ON TABLE drops IS 'Pílulas de conhecimento geradas a partir de questões';
COMMENT ON COLUMN drops.conteudo IS 'Conteúdo didático reformulado pela IA';
COMMENT ON COLUMN drops.exemplo_pratico IS 'Exemplo prático de aplicação do conceito';
COMMENT ON COLUMN drops.tecnicas_memorizacao IS 'Array JSON com técnicas de memorização (mnemônicos, mapas mentais, etc)';
COMMENT ON COLUMN drops.tempo_estimado_minutos IS 'Tempo estimado de estudo em minutos';
