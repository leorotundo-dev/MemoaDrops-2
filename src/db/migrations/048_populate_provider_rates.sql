-- Migration 048: Popular provider_rates com tarifas OpenAI

-- Inserir tarifas OpenAI (valores de novembro 2024)
INSERT INTO provider_rates (provider, service, env, unit, rate_per_unit, currency, created_at, updated_at) VALUES
('openai', 'gpt-4o-mini:input_token', 'prod', 'tokens', 0.00000015, 'USD', NOW(), NOW()),
('openai', 'gpt-4o-mini:output_token', 'prod', 'tokens', 0.0000006, 'USD', NOW(), NOW()),
('openai', 'gpt-4o:input_token', 'prod', 'tokens', 0.0000025, 'USD', NOW(), NOW()),
('openai', 'gpt-4o:output_token', 'prod', 'tokens', 0.00001, 'USD', NOW(), NOW())
ON CONFLICT (provider, service, env) DO UPDATE SET
  rate_per_unit = EXCLUDED.rate_per_unit,
  updated_at = NOW();

-- Comentário
COMMENT ON TABLE provider_rates IS 'Tarifas de provedores de IA para cálculo de custos';
