-- Migration 030: Adicionar relação entre concursos e bancas
-- Adiciona coluna banca_id para estabelecer foreign key com tabela bancas

-- Adicionar coluna banca_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='concursos' AND column_name='banca_id'
  ) THEN
    ALTER TABLE concursos ADD COLUMN banca_id INTEGER;
  END IF;
END $$;

-- Criar foreign key se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_concursos_banca_id'
  ) THEN
    ALTER TABLE concursos 
    ADD CONSTRAINT fk_concursos_banca_id 
    FOREIGN KEY (banca_id) REFERENCES bancas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_concursos_banca_id ON concursos(banca_id);

-- Nota: A tabela concursos original não tem campo 'banca'
-- Os concursos deverão ser associados às bancas manualmente ou via script

-- Comentários
COMMENT ON COLUMN concursos.banca_id IS 'ID da banca organizadora (foreign key para tabela bancas)';
