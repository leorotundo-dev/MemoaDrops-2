-- Migration 033: Criar tabela de questões
-- Armazena questões extraídas de provas de concursos

CREATE TABLE IF NOT EXISTS questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Origem
  arquivo_id UUID REFERENCES arquivos_concurso(id) ON DELETE SET NULL,
  concurso_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  banca_id INTEGER NOT NULL REFERENCES bancas(id) ON DELETE CASCADE,
  
  -- Identificação
  numero INTEGER NOT NULL,  -- Número da questão na prova (1-50)
  codigo VARCHAR(50),  -- Código único da questão (se houver)
  
  -- Conteúdo
  enunciado TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'multipla_escolha',  -- multipla_escolha, verdadeiro_falso, discursiva
  nivel_dificuldade VARCHAR(50),  -- facil, medio, dificil
  
  -- Resposta
  resposta_correta VARCHAR(10),  -- A, B, C, D, E
  explicacao TEXT,  -- Explicação gerada por IA ou manual
  
  -- Metadados
  tem_imagem BOOLEAN DEFAULT false,
  tem_tabela BOOLEAN DEFAULT false,
  tem_grafico BOOLEAN DEFAULT false,
  palavras_chave TEXT[],  -- Array de palavras-chave
  
  -- Estatísticas (futuro)
  total_respostas INTEGER DEFAULT 0,
  total_acertos INTEGER DEFAULT 0,
  taxa_acerto DECIMAL(5,2),  -- Percentual de acerto
  
  -- Controle de qualidade
  revisado BOOLEAN DEFAULT false,
  revisado_por UUID REFERENCES users(id) ON DELETE SET NULL,
  revisado_at TIMESTAMP,
  qualidade VARCHAR(50),  -- excelente, boa, regular, ruim
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_questoes_arquivo ON questoes(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_questoes_concurso ON questoes(concurso_id);
CREATE INDEX IF NOT EXISTS idx_questoes_banca ON questoes(banca_id);
CREATE INDEX IF NOT EXISTS idx_questoes_numero ON questoes(concurso_id, numero);
CREATE INDEX IF NOT EXISTS idx_questoes_tipo ON questoes(tipo);
CREATE INDEX IF NOT EXISTS idx_questoes_dificuldade ON questoes(nivel_dificuldade);
CREATE INDEX IF NOT EXISTS idx_questoes_revisado ON questoes(revisado);
CREATE INDEX IF NOT EXISTS idx_questoes_qualidade ON questoes(qualidade);
CREATE INDEX IF NOT EXISTS idx_questoes_created_at ON questoes(created_at DESC);

-- Full-text search no enunciado
CREATE INDEX IF NOT EXISTS idx_questoes_enunciado_fts ON questoes USING gin(to_tsvector('portuguese', enunciado));

-- Constraint: número único por arquivo
CREATE UNIQUE INDEX IF NOT EXISTS idx_questoes_numero_arquivo ON questoes(arquivo_id, numero) WHERE arquivo_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE questoes IS 'Questões extraídas de provas de concursos';
COMMENT ON COLUMN questoes.arquivo_id IS 'ID do arquivo PDF de onde a questão foi extraída (pode ser NULL para questões manuais)';
COMMENT ON COLUMN questoes.numero IS 'Número original da questão na prova';
COMMENT ON COLUMN questoes.enunciado IS 'Texto completo do enunciado da questão';
COMMENT ON COLUMN questoes.resposta_correta IS 'Letra da alternativa correta (A, B, C, D, E)';
COMMENT ON COLUMN questoes.explicacao IS 'Explicação da resposta (gerada por IA ou manual)';
COMMENT ON COLUMN questoes.revisado IS 'Indica se a questão foi revisada manualmente';
COMMENT ON COLUMN questoes.qualidade IS 'Avaliação de qualidade da questão (excelente, boa, regular, ruim)';
