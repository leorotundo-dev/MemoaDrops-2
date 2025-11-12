# Plano de Implementação - 31 Bancas

## Status Atual

**Total de bancas:** 31
**Funcionando:** 3 (FCC, FGV, QUADRIX)
**Não funcionando:** 28

## Categorização por Dificuldade

### Grupo A: Scrapers Já Existentes (Corrigir)
**Total:** 8 bancas
**Prioridade:** ALTA
**Tempo estimado:** 8-12 horas

1. ✅ **FCC** - Funcionando (12 concursos)
2. ✅ **FGV** - Funcionando (39 concursos)
3. ✅ **QUADRIX** - Funcionando (6 concursos)
4. ⚠️ **CEBRASPE** - Puppeteer não funciona (corrigir)
5. ⚠️ **VUNESP** - URL corrigida mas não executado
6. ❌ **CESGRANRIO** - HTTP 403 (Cloudflare)
7. ❌ **AOCP** - HTTP 403 (Cloudflare)
8. ❌ **IBFC** - HTTP 403 (Cloudflare)

### Grupo B: Bancas Analisadas (Implementar)
**Total:** 3 bancas
**Prioridade:** ALTA
**Tempo estimado:** 6-9 horas

9. 🆕 **IADES** - HTML estático (~11 concursos)
10. 🆕 **FUNDATEC** - HTML estático (~18 concursos)
11. 🆕 **IBADE** - Portal moderno (~16 concursos)

### Grupo C: Top 20 Restantes (Analisar + Implementar)
**Total:** 9 bancas
**Prioridade:** MÉDIA
**Tempo estimado:** 18-24 horas

12. 🔍 **IDECAN** - Cloudflare (analisado)
13. 🔍 **CONSULPLAN** - A analisar
14. 🔍 **OBJETIVA** - A analisar (duplicado no banco)
15. 🔍 **FADESP** - A analisar
16. 🔍 **CETRO** - A analisar
17. 🔍 **FUNCERN** - A analisar
18. 🔍 **COPEVE/UFAL** - A analisar
19. 🔍 **FEPESE** - A analisar
20. 🔍 **FUMARC** - A analisar

### Grupo D: Bancas Extras (Analisar + Implementar)
**Total:** 11 bancas
**Prioridade:** BAIXA
**Tempo estimado:** 22-33 horas

21. ❓ **INSTITUTO AOCP** - Duplicado?
22. ❓ **cespe_cebraspe** - Duplicado?
23. ❓ **fundacao_carlos_chagas** - Duplicado?
24. ❓ **fundacao_getulio_vargas** - Duplicado?
25. ❓ **instituto_aocp** - Duplicado?
26. ❓ **FUNCAB** - A analisar
27. ❓ **INSTITUTO MAIS** - A analisar
28. ❓ **UFPR** - A analisar
29. ❓ **INSTITUTO EXCELENCIA** - A analisar
30. ❓ **IBAM** - A analisar
31. ❓ **objetiva** (minúscula) - Duplicado?

## Observação Importante: Duplicatas

Há várias bancas duplicadas no banco com nomes diferentes:
- **CEBRASPE** / cespe_cebraspe
- **FCC** / fundacao_carlos_chagas
- **FGV** / fundacao_getulio_vargas
- **AOCP** / INSTITUTO AOCP / instituto_aocp
- **OBJETIVA** / objetiva

**Ação necessária:** Limpar duplicatas antes de implementar scrapers

## Estratégia de Implementação

### FASE 1: Vitórias Rápidas (1-2 dias)
**Objetivo:** Dobrar o número de concursos rapidamente

1. Implementar IADES (6-9h)
2. Implementar FUNDATEC (6-9h)
3. Implementar IBADE (6-9h)
4. Executar VUNESP corrigida (1h)

**Resultado esperado:** +60 concursos (57 → 117)

### FASE 2: Correção de Existentes (2-3 dias)
**Objetivo:** Fazer scrapers existentes funcionarem

1. Corrigir CEBRASPE (Puppeteer) (4-6h)
2. Implementar solução Cloudflare genérica (8-12h)
3. Aplicar em CESGRANRIO, AOCP, IBFC (2-3h)

**Resultado esperado:** +50-80 concursos

### FASE 3: Top 20 Restantes (1 semana)
**Objetivo:** Completar Top 20 bancas

1. Analisar 8 bancas restantes (8-12h)
2. Implementar scrapers (16-24h)
3. Testar e validar (4-6h)

**Resultado esperado:** +60-100 concursos

### FASE 4: Limpeza e Extras (1 semana)
**Objetivo:** Limpar duplicatas e implementar bancas extras

1. Identificar e remover duplicatas (2-3h)
2. Analisar bancas extras (6-8h)
3. Implementar scrapers extras (12-18h)

**Resultado esperado:** +30-50 concursos

## Cronograma

| Fase | Duração | Bancas | Concursos | Total Acumulado |
|------|---------|--------|-----------|-----------------|
| Atual | - | 3 | 57 | 57 |
| Fase 1 | 1-2 dias | +4 | +60 | 117 |
| Fase 2 | 2-3 dias | +4 | +70 | 187 |
| Fase 3 | 1 semana | +8 | +80 | 267 |
| Fase 4 | 1 semana | +12 | +40 | 307 |

**Total:** ~3 semanas para 31 bancas funcionando com 300+ concursos

## Prioridades Imediatas (HOJE)

### 1. Limpar Duplicatas (1-2h)
- Identificar bancas duplicadas
- Decidir qual nome manter
- Atualizar referências
- Remover duplicatas

### 2. Implementar IADES (2-3h)
- Criar scraper com Axios + Cheerio
- Testar localmente
- Fazer commit e deploy

### 3. Implementar FUNDATEC (2-3h)
- Criar scraper com Axios + Cheerio
- Testar localmente
- Fazer commit e deploy

### 4. Implementar IBADE (2-3h)
- Criar scraper com Axios + Cheerio
- Testar localmente
- Fazer commit e deploy

## Métricas de Sucesso

### Curto Prazo (Esta Semana)
- [ ] 7/31 bancas funcionando (23%)
- [ ] 120+ concursos no banco
- [ ] 0 duplicatas

### Médio Prazo (2 Semanas)
- [ ] 15/31 bancas funcionando (48%)
- [ ] 200+ concursos no banco
- [ ] Solução Cloudflare funcionando

### Longo Prazo (1 Mês)
- [ ] 31/31 bancas funcionando (100%)
- [ ] 300+ concursos no banco
- [ ] Sistema de monitoramento ativo
- [ ] Documentação completa

## Próximos Passos

1. **AGORA:** Limpar duplicatas do banco
2. **HOJE:** Implementar IADES, FUNDATEC, IBADE
3. **AMANHÃ:** Testar e validar em produção
4. **ESTA SEMANA:** Corrigir CEBRASPE e implementar solução Cloudflare
