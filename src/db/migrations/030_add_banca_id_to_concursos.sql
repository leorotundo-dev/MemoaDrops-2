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

-- Tentar mapear concursos existentes para bancas
-- Atualiza banca_id baseado no campo banca (texto)
UPDATE concursos c
SET banca_id = b.id
FROM bancas b
WHERE c.banca_id IS NULL
  AND (
    LOWER(c.banca) = LOWER(b.name) OR
    LOWER(c.banca) = LOWER(b.display_name) OR
    LOWER(c.banca) = LOWER(b.short_name)
  );

-- Comentários
COMMENT ON COLUMN concursos.banca_id IS 'ID da banca organizadora (foreign key para tabela bancas)';
