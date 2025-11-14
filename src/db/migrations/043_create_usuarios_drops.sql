-- Migration: 043_create_usuarios_drops.sql
-- Descrição: Cria tabela para tracking de drops por usuário com algoritmo SM-2
-- Data: 2025-11-14

-- Tabela principal de tracking de drops por usuário
CREATE TABLE IF NOT EXISTS usuarios_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  
  -- Tracking de revisões
  primeira_revisao_em TIMESTAMP,
  ultima_revisao_em TIMESTAMP,
  proxima_revisao_em TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Algoritmo SM-2 (SuperMemo 2)
  numero_revisoes INTEGER DEFAULT 0 CHECK (numero_revisoes >= 0),
  easiness_factor DECIMAL(3,2) DEFAULT 2.50 CHECK (easiness_factor >= 1.30),
  intervalo_atual_dias INTEGER DEFAULT 1 CHECK (intervalo_atual_dias >= 1),
  
  -- Histórico de qualidade (0-5)
  ultima_qualidade INTEGER CHECK (ultima_qualidade >= 0 AND ultima_qualidade <= 5),
  qualidade_media DECIMAL(3,2) CHECK (qualidade_media >= 0 AND qualidade_media <= 5),
  
  -- Status do drop para o usuário
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'revisado', 'dominado')),
  dominado_em TIMESTAMP,
  
  -- Metadata
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  
  -- Garantir que cada usuário tenha apenas um registro por drop
  UNIQUE(usuario_id, drop_id)
);

-- Índices para otimizar consultas frequentes

-- Índice para buscar drops do dia (query mais frequente)
CREATE INDEX idx_usuarios_drops_proxima_revisao 
  ON usuarios_drops(usuario_id, proxima_revisao_em, status)
  WHERE status != 'dominado';

-- Índice para estatísticas por status
CREATE INDEX idx_usuarios_drops_status 
  ON usuarios_drops(usuario_id, status);

-- Índice para buscar por drop específico
CREATE INDEX idx_usuarios_drops_drop_id 
  ON usuarios_drops(drop_id);

-- Índice para ordenação por data de criação
CREATE INDEX idx_usuarios_drops_criado_em 
  ON usuarios_drops(usuario_id, criado_em DESC);

-- Comentários para documentação
COMMENT ON TABLE usuarios_drops IS 'Tracking de drops por usuário com algoritmo SM-2 de repetição espaçada';
COMMENT ON COLUMN usuarios_drops.easiness_factor IS 'Fator de facilidade do SM-2 (mínimo 1.3, inicial 2.5)';
COMMENT ON COLUMN usuarios_drops.intervalo_atual_dias IS 'Intervalo em dias até próxima revisão calculado pelo SM-2';
COMMENT ON COLUMN usuarios_drops.ultima_qualidade IS 'Última avaliação do usuário (0=não lembrou, 5=lembrou perfeitamente)';
COMMENT ON COLUMN usuarios_drops.status IS 'pendente=nunca visto, revisado=em processo, dominado=usuário dominou';
