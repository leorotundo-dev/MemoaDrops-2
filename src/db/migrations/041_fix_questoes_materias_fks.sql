-- Migration 041: Corrigir Foreign Keys em questoes_materias
-- Data: 14/11/2025
-- Objetivo: Adicionar constraints de integridade referencial faltantes

-- Verificar se as constraints já existem antes de adicionar
DO $$
BEGIN
  -- 1. Adicionar FK para materia_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_questoes_materias_materia' 
    AND table_name = 'questoes_materias'
  ) THEN
    ALTER TABLE questoes_materias 
      ADD CONSTRAINT fk_questoes_materias_materia 
      FOREIGN KEY (materia_id) 
      REFERENCES materias(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE 'FK fk_questoes_materias_materia criada com sucesso';
  ELSE
    RAISE NOTICE 'FK fk_questoes_materias_materia já existe';
  END IF;

  -- 2. Adicionar FK para topico_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_questoes_materias_topico' 
    AND table_name = 'questoes_materias'
  ) THEN
    ALTER TABLE questoes_materias 
      ADD CONSTRAINT fk_questoes_materias_topico 
      FOREIGN KEY (topico_id) 
      REFERENCES topicos(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE 'FK fk_questoes_materias_topico criada com sucesso';
  ELSE
    RAISE NOTICE 'FK fk_questoes_materias_topico já existe';
  END IF;
END $$;
