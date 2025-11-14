-- Migration 038: Adicionar relacionamento entre cards e questões
-- Permite criar flashcards a partir de questões de concursos

DO $$ 
BEGIN
  -- Adicionar questao_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='cards' AND column_name='questao_id'
  ) THEN
    ALTER TABLE cards ADD COLUMN questao_id UUID REFERENCES questoes(id) ON DELETE SET NULL;
  END IF;
  
  -- Adicionar tipo se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='cards' AND column_name='tipo'
  ) THEN
    ALTER TABLE cards ADD COLUMN tipo VARCHAR(50) DEFAULT 'manual';
  END IF;
END $$;

-- Índice
CREATE INDEX IF NOT EXISTS idx_cards_questao ON cards(questao_id);
CREATE INDEX IF NOT EXISTS idx_cards_tipo ON cards(tipo);

-- Comentários
COMMENT ON COLUMN cards.questao_id IS 'ID da questão de concurso (se o card foi gerado de uma questão)';
COMMENT ON COLUMN cards.tipo IS 'Tipo do card (manual, questao_concurso, gerado_ia)';
