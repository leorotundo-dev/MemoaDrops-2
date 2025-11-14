CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sessões do tutor
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_id UUID,            -- concurso/edital (opcional)
  subject_id UUID,         -- matéria (opcional)
  goal TEXT,               -- objetivo da sessão
  mode TEXT NOT NULL CHECK (mode IN ('socratic','explain_first','quiz')) DEFAULT 'socratic',
  difficulty TEXT CHECK (difficulty IN ('auto','easy','medium','hard')) DEFAULT 'auto',
  state TEXT NOT NULL CHECK (state IN ('active','archived','ended')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Turnos (mensagens + hints)
CREATE TABLE IF NOT EXISTS tutor_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES tutor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
  content JSONB NOT NULL,           -- { text, hint_level, refs, ... }
  model TEXT,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referências (RAG) por turno
CREATE TABLE IF NOT EXISTS tutor_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id UUID REFERENCES tutor_turns(id) ON DELETE CASCADE,
  source_type TEXT,                 -- 'edital','lei','aula','deck','questao'
  source_id TEXT,
  title TEXT,
  snippet TEXT,
  score NUMERIC(5,3)
);

-- Rubricas
CREATE TABLE IF NOT EXISTS tutor_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT,            -- exemplo: 'direito_constitucional'
  banca TEXT,            -- ex.: 'cebraspe','fgv'
  rubric JSONB NOT NULL, -- critérios com pesos
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas (retenção/privacidade)
CREATE TABLE IF NOT EXISTS edu_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,      -- null = global
  retain_days INT DEFAULT 180,
  pii_masking BOOLEAN DEFAULT true,
  allow_export BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutor_turns_session ON tutor_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_tutor_refs_turn ON tutor_refs(turn_id);
