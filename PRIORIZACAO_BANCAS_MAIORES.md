# Priorização - Bancas Maiores

## Top 5 Bancas Nacionais (Por Volume e Importância)

### 1. 🔴 CEBRASPE (Cespe/UnB)
- **Status:** ❌ Não funcionando
- **Volume estimado:** 50-80 concursos
- **Importância:** ⭐⭐⭐⭐⭐ (Maior banca do Brasil)
- **Problema:** Puppeteer não funciona em produção
- **Prioridade:** CRÍTICA

**Concursos típicos:**
- Grandes órgãos federais (Polícia Federal, Receita Federal, etc.)
- Tribunais (STJ, TRFs, TRTs)
- Universidades federais
- Órgãos estaduais de grande porte

### 2. 🟡 VUNESP (Fundação Vunesp)
- **Status:** ⚠️ URL corrigida, não testado
- **Volume estimado:** 30-50 concursos
- **Importância:** ⭐⭐⭐⭐⭐ (Segunda maior do Brasil)
- **Problema:** Precisa usar Puppeteer
- **Prioridade:** ALTA

**Concursos típicos:**
- Governo do Estado de São Paulo
- Prefeituras paulistas
- Universidades estaduais (USP, Unesp, Unicamp)
- Empresas públicas de SP

### 3. 🔴 CESGRANRIO
- **Status:** ❌ HTTP 403 (Cloudflare)
- **Volume estimado:** 20-40 concursos
- **Importância:** ⭐⭐⭐⭐ (Grandes estatais)
- **Problema:** Cloudflare bloqueando
- **Prioridade:** ALTA

**Concursos típicos:**
- Petrobras
- Banco do Brasil
- Caixa Econômica Federal
- Eletrobras

### 4. ✅ FGV (Fundação Getulio Vargas)
- **Status:** ✅ Funcionando (40 concursos)
- **Importância:** ⭐⭐⭐⭐
- **Observação:** JÁ FUNCIONANDO

### 5. ✅ FCC (Fundação Carlos Chagas)
- **Status:** ✅ Funcionando (12 concursos)
- **Importância:** ⭐⭐⭐⭐
- **Observação:** JÁ FUNCIONANDO

## Bancas Médias com Bom Volume

### 6. 🟢 FEPESE
- **Status:** 🔍 Analisada, não implementada
- **Volume estimado:** 21 concursos
- **Importância:** ⭐⭐⭐ (Santa Catarina)
- **Problema:** WordPress/JavaScript
- **Prioridade:** MÉDIA

### 7. 🔴 AOCP
- **Status:** ❌ HTTP 403 (Cloudflare)
- **Volume estimado:** 15-25 concursos
- **Importância:** ⭐⭐⭐
- **Problema:** Cloudflare
- **Prioridade:** MÉDIA

### 8. 🔴 IBFC
- **Status:** ❌ HTTP 403 (Cloudflare)
- **Volume estimado:** 15-20 concursos
- **Importância:** ⭐⭐⭐
- **Problema:** Cloudflare
- **Prioridade:** MÉDIA

### 9. 🟢 FUNCERN
- **Status:** 🆕 Implementada, não funcionou
- **Volume estimado:** 11 concursos
- **Importância:** ⭐⭐ (Rio Grande do Norte)
- **Problema:** Seletores incorretos
- **Prioridade:** BAIXA

### 10. ✅ FUNDATEC
- **Status:** ✅ Funcionando (27 concursos)
- **Importância:** ⭐⭐⭐
- **Observação:** JÁ FUNCIONANDO

## Plano de Ação Focado

### FASE 1: Bancas Críticas (Impacto Máximo)
**Objetivo:** +100-150 concursos

1. **CEBRASPE** (50-80 concursos)
   - Corrigir Puppeteer em produção
   - Tempo estimado: 2-4 horas

2. **VUNESP** (30-50 concursos)
   - Testar URL corrigida
   - Ajustar Puppeteer se necessário
   - Tempo estimado: 1-2 horas

**Resultado esperado:** 180 → 280-330 concursos (+55-83%)

### FASE 2: Bancas Importantes (Alto Impacto)
**Objetivo:** +40-60 concursos

3. **CESGRANRIO** (20-40 concursos)
   - Implementar solução Cloudflare
   - Tempo estimado: 3-4 horas

4. **FEPESE** (21 concursos)
   - Implementar scraper WordPress
   - Tempo estimado: 1-2 horas

**Resultado esperado:** 280-330 → 320-390 concursos

### FASE 3: Bancas Médias (Completar Cobertura)
**Objetivo:** +30-45 concursos

5. **AOCP** (15-25 concursos)
   - Aplicar solução Cloudflare
   - Tempo estimado: 1h

6. **IBFC** (15-20 concursos)
   - Aplicar solução Cloudflare
   - Tempo estimado: 1h

**Resultado esperado:** 320-390 → 350-435 concursos

## Resumo Executivo

| Fase | Bancas | Concursos | Tempo | Prioridade |
|------|--------|-----------|-------|------------|
| **Fase 1** | CEBRASPE, VUNESP | +80-130 | 3-6h | CRÍTICA |
| **Fase 2** | CESGRANRIO, FEPESE | +40-60 | 4-6h | ALTA |
| **Fase 3** | AOCP, IBFC | +30-45 | 2h | MÉDIA |

**Meta:** Sair de 180 concursos para 350-435 concursos (+94-142%)

**Foco imediato:** CEBRASPE e VUNESP (as 2 maiores bancas do Brasil)
