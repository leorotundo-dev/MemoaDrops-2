-- Migration 049: Adicionar campos extras de concursos
-- Adiciona campos de valor de inscrição, requisitos, tipo de prova, etc.

ALTER TABLE concursos ADD COLUMN IF NOT EXISTS valor_inscricao NUMERIC(10,2);
ALTER TABLE concursos ADD COLUMN IF NOT EXISTS requisitos TEXT;
ALTER TABLE concursos ADD COLUMN IF NOT EXISTS tipo_prova VARCHAR(255);
ALTER TABLE concursos ADD COLUMN IF NOT EXISTS carga_horaria INTEGER;
ALTER TABLE concursos ADD COLUMN IF NOT EXISTS regime_juridico VARCHAR(100);
ALTER TABLE concursos ADD COLUMN IF NOT EXISTS jornada_trabalho VARCHAR(255);
ALTER TABLE concursos ADD COLUMN IF NOT EXISTS beneficios TEXT;

-- Comentários das colunas
COMMENT ON COLUMN concursos.valor_inscricao IS 'Valor da taxa de inscrição';
COMMENT ON COLUMN concursos.requisitos IS 'Requisitos principais (escolaridade, idade, etc.)';
COMMENT ON COLUMN concursos.tipo_prova IS 'Tipos de prova (Objetiva, Discursiva, Títulos, etc.)';
COMMENT ON COLUMN concursos.carga_horaria IS 'Carga horária semanal em horas';
COMMENT ON COLUMN concursos.regime_juridico IS 'Regime jurídico (Estatutário, CLT, Temporário)';
COMMENT ON COLUMN concursos.jornada_trabalho IS 'Descrição da jornada de trabalho';
COMMENT ON COLUMN concursos.beneficios IS 'Benefícios oferecidos';
