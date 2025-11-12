# Análise IBADE

## URL Principal
- Site: https://ibade.org.br
- Portal de concursos: https://portal.ibade.selecao.site/edital

## Estrutura
- ✅ **Sistema moderno** - Portal separado para concursos
- ✅ **Sem proteção Cloudflare**
- ✅ **Estrutura organizada por abas**

## Categorias
1. **FUTUROS** - Concursos previstos
2. **INSCRIÇÕES ABERTAS** - Concursos com inscrições ativas
3. **EM ANDAMENTO** - Concursos em execução
4. **FINALIZADOS** - Concursos encerrados
5. **SUSPENSOS E CANCELADOS** - Concursos suspensos

## Concursos Visíveis (Inscrições Abertas)
1. Processo Seletivo Simplificado - SES/MG Nº 01/2025
   - SECRETARIA DE ESTADO DE SAÚDE DE MINAS GERAIS

2. Concurso Público - 001/2025
   - CONSELHO REGIONAL DE EDUCAÇÃO FÍSICA DA 19ªREGIÃO-CREF19/AL

3. Concurso Público - 01/2025
   - POLÍCIA CIVIL DO ESTADO DO ESPÍRITO SANTO

## Concursos em Andamento (13+ visíveis)
- Prefeitura Municipal de Castelo/ES
- Prefeitura de Florianópolis/SC
- CREFITO6
- Brigada Militar/RS
- E muitos outros...

## Seletores Identificados
- Container: Cards com logo, título e botão
- Tipo: "PROCESSO SELETIVO SIMPLIFICADO", "CONCURSO PÚBLICO"
- Instituição: Nome em MAIÚSCULAS
- Status: "Inscrições Abertas" (botão verde)
- Número do edital: "Nº 01/2025", "001/2025"

## Solução
1. **Axios + Cheerio** - Scraping do portal
2. Acessar aba "INSCRIÇÕES ABERTAS"
3. Extrair cards de concursos
4. Parsear informações estruturadas

## Prioridade
- **ALTA** - Banca importante (Tier 2, prioridade 45)
- **MÉDIO** - Portal moderno mas estruturado
- **ALTO VOLUME** - 3 com inscrições abertas + 13+ em andamento

## Próximos Passos
- Implementar scraper com Axios
- Testar extração de dados do portal
- Validar links e informações

## Notas
- Portal bem estruturado e moderno
- Sem proteções anti-bot
- Boa quantidade de concursos ativos
- Forte presença no RJ, ES e RO
- Sistema "Gestor Editais" (plataforma terceirizada)
