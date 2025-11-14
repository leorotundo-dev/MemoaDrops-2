-- Migration 047: Adicionar concurso_id em questoes

-- Adicionar coluna concurso_id
ALTER TABLE questoes 
ADD COLUMN IF NOT EXISTS concurso_id UUID;

-- Criar índice para busca rápida por concurso
CREATE INDEX IF NOT EXISTS idx_questoes_concurso 
ON questoes(concurso_id);

-- Preencher concurso_id para questões existentes (via arquivo)
UPDATE questoes q
SET concurso_id = a.concurso_id
FROM arquivos_concurso a
WHERE q.arquivo_id = a.id
AND q.concurso_id IS NULL;

-- Comentários
COMMENT ON COLUMN questoes.concurso_id IS 'ID do concurso ao qual a questão pertence (desnormalizado para performance)';
