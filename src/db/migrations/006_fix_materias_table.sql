-- Migration 006: Fix materias table structure
-- Corrige a estrutura da tabela materias para suportar matérias por concurso

-- Drop tabela antiga se existir
DROP TABLE IF EXISTS materias CASCADE;

-- Criar tabela materias correta
CREATE TABLE IF NOT EXISTS materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contest_id, slug)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_materias_contest_id ON materias(contest_id);
CREATE INDEX IF NOT EXISTS idx_materias_slug ON materias(slug);

-- Comentários
COMMENT ON TABLE materias IS 'Matérias/disciplinas que serão cobradas em cada concurso';
COMMENT ON COLUMN materias.contest_id IS 'ID do concurso ao qual a matéria pertence';
COMMENT ON COLUMN materias.nome IS 'Nome da matéria (ex: Língua Portuguesa, Matemática)';
COMMENT ON COLUMN materias.slug IS 'Slug da matéria para URLs (ex: lingua-portuguesa, matematica)';
