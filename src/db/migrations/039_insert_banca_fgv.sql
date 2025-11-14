-- Migration 039: Inserir banca FGV
-- Garante que a banca FGV está cadastrada no sistema

INSERT INTO bancas (
  name,
  full_name,
  acronym,
  area,
  description,
  website,
  is_active,
  total_contests
)
VALUES (
  'FGV',
  'Fundação Getulio Vargas',
  'FGV',
  'federal',
  'A Fundação Getulio Vargas é uma instituição brasileira de ensino e pesquisa, reconhecida internacionalmente pela excelência acadêmica e pela organização de concursos públicos de alto nível.',
  'https://conhecimento.fgv.br',
  true,
  0
)
ON CONFLICT (name) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  acronym = EXCLUDED.acronym,
  area = EXCLUDED.area,
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Comentário
COMMENT ON TABLE bancas IS 'Bancas organizadoras de concursos públicos';
