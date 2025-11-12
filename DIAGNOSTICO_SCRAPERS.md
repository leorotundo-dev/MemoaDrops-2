# Diagnóstico Completo dos Scrapers - MemoDrops 2

## Resumo Executivo

Após análise detalhada, identificamos os problemas específicos de cada scraper e suas soluções.

**Status Atual:**
- ✅ **2 scrapers funcionando:** FCC (12 concursos) e FGV (37 concursos)
- ❌ **6 scrapers com problemas:** CEBRASPE, QUADRIX, VUNESP, CESGRANRIO, IBFC, AOCP

---

## Análise Detalhada por Banca

### 1. CEBRASPE ⚠️ (0 concursos)

**Problema:** Página usa React (SPA - Single Page Application)
- O conteúdo é renderizado dinamicamente via JavaScript
- axios/cheerio não consegue capturar elementos renderizados por JS

**URL Atual:** `https://www.cebraspe.org.br/concursos` ✅ (correta)

**Solução:**
- Migrar para **Puppeteer** (já está na lista de bancas que usam Puppeteer)
- Aguardar renderização completa antes de extrair dados
- Seletores sugeridos:
  ```typescript
  'a[href*="/concursos/"]'
  'button:has-text("MAIS INFORMAÇÕES")'
  '.card a'
  ```

---

### 2. QUADRIX ⚠️ (0 concursos)

**Problema:** URL incorreta no código

**URL Antiga (incorreta):** `https://www.quadrix.org.br/concursos.aspx` ❌
**URL Correta:** `https://site.quadrix.org.br/` ✅

**Observações:**
- A página mostra 6 concursos com inscrições abertas
- Estrutura de cards com links para cada concurso
- Conteúdo estático (não requer Puppeteer)

**Solução:**
- Atualizar URL no dicionário `BANCA_CONTEST_URLS`
- Seletores sugeridos:
  ```typescript
  'a[href*="inscricoes-abertas"]'
  '.card a'
  'a:has-text("VISUALIZAR")'
  ```

---

### 3. VUNESP ❌ (0 concursos - HTTP 404)

**Problema:** URL incorreta no código

**URL Antiga (incorreta):** `https://www.vunesp.com.br/VUNESP/concursos.html` ❌
**URL Correta:** `https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas` ✅

**Observações:**
- Página mostra concursos com inscrições abertas
- Estrutura de cards com informações detalhadas
- Conteúdo pode ser dinâmico (JavaScript)

**Solução:**
- Atualizar URL no dicionário `BANCA_CONTEST_URLS`
- Testar com axios/cheerio primeiro
- Se não funcionar, migrar para Puppeteer
- Seletores sugeridos:
  ```typescript
  'a[href*="concurso"]'
  '.card a'
  'a:has-text("SAIBA MAIS")'
  ```

---

### 4. CESGRANRIO ❌ (0 concursos - HTTP 403)

**Problema:** Bloqueio anti-bot (HTTP 403)

**URL Atual:** `https://www.cesgranrio.org.br/concursos/` ✅

**Solução:**
- Já está na lista de bancas que usam Puppeteer ✅
- Verificar se o Puppeteer está sendo executado corretamente
- Adicionar headers e user-agent realistas
- Possível necessidade de:
  - Rotação de user-agents
  - Delays entre requisições
  - Stealth mode do Puppeteer

---

### 5. IBFC ❌ (0 concursos - HTTP 403)

**Problema:** Bloqueio anti-bot (HTTP 403)

**URL Atual:** `https://www.ibfc.org.br/concursos-abertos` ✅

**Solução:**
- Já está na lista de bancas que usam Puppeteer ✅
- Mesmas recomendações do CESGRANRIO
- Verificar implementação do Puppeteer

---

### 6. AOCP ❌ (0 concursos - HTTP 403)

**Problema:** Bloqueio anti-bot (HTTP 403)

**URL Atual:** `https://www.institutoaocp.org.br/concursos` ✅

**Solução:**
- Já está na lista de bancas que usam Puppeteer ✅
- Mesmas recomendações do CESGRANRIO e IBFC
- Verificar implementação do Puppeteer

---

## Correções Necessárias

### 1. Atualizar URLs no código

**Arquivo:** `src/services/contest-discovery-scraper.ts`

```typescript
const BANCA_CONTEST_URLS: Record<string, string> = {
  'cebraspe': 'https://www.cebraspe.org.br/concursos',
  'fcc': 'https://www.concursosfcc.com.br/concursos',
  'fgv': 'https://conhecimento.fgv.br/concursos',
  'vunesp': 'https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas', // ✅ CORRIGIR
  'cesgranrio': 'https://www.cesgranrio.org.br/concursos/',
  'quadrix': 'https://site.quadrix.org.br/', // ✅ CORRIGIR
  'ibfc': 'https://www.ibfc.org.br/concursos-abertos',
  'aocp': 'https://www.institutoaocp.org.br/concursos',
};
```

### 2. Adicionar CEBRASPE à lista de bancas Puppeteer

```typescript
const puppeteerBancas = ['cesgranrio', 'ibfc', 'aocp', 'vunesp', 'cebraspe']; // ✅ ADICIONAR CEBRASPE
```

### 3. Atualizar seletores CSS

**Para CEBRASPE (Puppeteer):**
```typescript
'cebraspe': [
  'a[href*="/concursos/"]',
  'button:has-text("MAIS INFORMAÇÕES")',
  '.card a',
],
```

**Para QUADRIX (axios/cheerio):**
```typescript
'quadrix': [
  'a[href*="inscricoes-abertas"]',
  '.card a',
  'a:has-text("VISUALIZAR")',
],
```

**Para VUNESP (testar axios primeiro, depois Puppeteer se necessário):**
```typescript
'vunesp': [
  'a[href*="concurso"]',
  '.card a',
  'a:has-text("SAIBA MAIS")',
],
```

### 4. Melhorar implementação do Puppeteer

**Arquivo:** `src/services/puppeteer-scraper.ts`

Adicionar:
- Stealth mode para evitar detecção
- Rotação de user-agents
- Delays aleatórios entre ações
- Tratamento de timeouts
- Screenshots para debug

---

## Plano de Ação

### Fase 1: Correções Rápidas (URLs)
1. ✅ Atualizar URL da QUADRIX
2. ✅ Atualizar URL da VUNESP
3. ✅ Testar scrapers após correção

### Fase 2: Ajustes de Seletores
1. ✅ Adicionar CEBRASPE à lista Puppeteer
2. ✅ Atualizar seletores CSS de cada banca
3. ✅ Testar cada scraper individualmente

### Fase 3: Melhorias no Puppeteer
1. ✅ Implementar stealth mode
2. ✅ Adicionar tratamento robusto de erros
3. ✅ Implementar retry logic
4. ✅ Adicionar logging detalhado

### Fase 4: Validação Final
1. ✅ Executar scraping completo de todas as bancas
2. ✅ Verificar dados no banco
3. ✅ Validar exibição no Admin Dashboard

---

## Expectativa de Resultados

Após as correções:

| Banca | Status Atual | Status Esperado | Estimativa de Concursos |
|-------|-------------|-----------------|------------------------|
| FCC | ✅ Funcionando | ✅ Funcionando | 12+ |
| FGV | ✅ Funcionando | ✅ Funcionando | 37+ |
| CEBRASPE | ❌ 0 concursos | ✅ Funcionando | 40-60 |
| QUADRIX | ❌ 0 concursos | ✅ Funcionando | 6-10 |
| VUNESP | ❌ HTTP 404 | ✅ Funcionando | 5-15 |
| CESGRANRIO | ❌ HTTP 403 | ⚠️ Pode funcionar | 10-20 |
| IBFC | ❌ HTTP 403 | ⚠️ Pode funcionar | 5-15 |
| AOCP | ❌ HTTP 403 | ⚠️ Pode funcionar | 5-15 |

**Total Esperado:** 120-200 concursos (vs. 49 atuais)

---

## Observações Importantes

1. **Bancas com HTTP 403:** Mesmo com Puppeteer, podem continuar bloqueando. Alternativas:
   - Usar proxies rotativos
   - Implementar delays maiores entre requisições
   - Considerar APIs oficiais se disponíveis

2. **Manutenção:** Sites de bancas mudam frequentemente. Recomenda-se:
   - Monitoramento diário dos scrapers
   - Alertas automáticos quando scrapers falham
   - Revisão mensal dos seletores CSS

3. **Performance:** Puppeteer é mais lento que axios/cheerio:
   - Considerar executar scrapers em paralelo
   - Implementar cache de resultados
   - Usar worker dedicado para scraping

---

## Próximos Passos

1. Implementar correções de URLs
2. Atualizar seletores CSS
3. Melhorar implementação Puppeteer
4. Testar cada banca individualmente
5. Deploy e validação em produção
6. Monitorar resultados por 7 dias
7. Ajustar conforme necessário
