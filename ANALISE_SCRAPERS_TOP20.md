# Análise de Scrapers - Top 20 Bancas

## Status Atual

**Bancas cadastradas:** 31 (incluindo as Top 20)
**Concursos no banco:** 57 total
**Bancas funcionando:** 3/20 (15%)

### Bancas com Scrapers Funcionando
1. ✅ **FCC** - 12 concursos
2. ✅ **FGV** - 39 concursos  
3. ✅ **QUADRIX** - 6 concursos

### Bancas com Scrapers Parciais/Problemáticos
4. ⚠️ **CEBRASPE** - 0 concursos (Puppeteer não funciona)
5. ⚠️ **VUNESP** - 0 concursos (URL corrigida mas não executado)
6. ❌ **CESGRANRIO** - 0 concursos (HTTP 403)
7. ❌ **AOCP** - 0 concursos (HTTP 403)
8. ❌ **IBFC** - 0 concursos (HTTP 403)

### Bancas Sem Scrapers (12 novas)
9. 🆕 **IDECAN**
10. 🆕 **IADES**
11. 🆕 **FUNDATEC**
12. 🆕 **IBADE**
13. 🆕 **CONSULPLAN**
14. 🆕 **OBJETIVA**
15. 🆕 **FADESP**
16. 🆕 **CETRO**
17. 🆕 **FUNCERN**
18. 🆕 **COPEVE/UFAL**
19. 🆕 **FEPESE**
20. 🆕 **FUMARC**

## Estratégia de Implementação

### Fase 1: Corrigir Scrapers Existentes (Prioridade Alta)
1. **CEBRASPE** - Implementar Puppeteer corretamente
2. **VUNESP** - Executar scraper com URL corrigida
3. **CESGRANRIO, AOCP, IBFC** - Implementar bypass de bloqueio (Puppeteer Stealth + User-Agent)

### Fase 2: Implementar Scrapers das Top 12 Novas Bancas
**Abordagem:**
- Visitar cada site manualmente
- Identificar página de "Concursos Abertos" ou "Inscrições Abertas"
- Analisar estrutura HTML (seletores CSS)
- Determinar se precisa Puppeteer (JavaScript) ou Axios (HTML estático)
- Implementar scraper específico

### Fase 3: Criar Sistema de Scraping Genérico
- Implementar scraper baseado em padrões comuns
- Usar IA para identificar links de concursos automaticamente
- Reduzir manutenção futura

## Próximos Passos

1. ✅ Cadastrar Top 20 bancas no banco
2. 🔄 **ATUAL:** Analisar estrutura dos sites
3. ⏳ Implementar scrapers específicos
4. ⏳ Testar e validar
5. ⏳ Deploy e monitoramento

## Notas Técnicas

### Tipos de Sites
- **HTML Estático:** Axios + Cheerio (mais rápido)
- **JavaScript/React:** Puppeteer (mais lento, mais recursos)
- **Bloqueio Anti-Bot:** Puppeteer Stealth + Proxies

### Seletores Comuns
- Links de concursos: `a[href*="concurso"]`, `a[href*="edital"]`
- Títulos: `.concurso-titulo`, `.edital-nome`, `h2`, `h3`
- Datas: `.data-inscricao`, `.prazo`, `time`
- Status: `.status`, `.situacao`, `.badge`

### Performance
- Scraping paralelo: Máximo 5 bancas simultâneas
- Timeout: 30 segundos por banca
- Retry: 3 tentativas com backoff exponencial
- Cache: 1 hora para evitar re-scraping
