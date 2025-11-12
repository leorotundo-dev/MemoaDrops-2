# Análise IADES

## URL Principal
- Site: https://www.iades.com.br
- Concursos em andamento: https://www.iades.com.br/inscricao/?v=andamento

## Estrutura
- ✅ **HTML Estático** - Sem JavaScript obrigatório
- ✅ **Sem proteção Cloudflare**
- ✅ **Estrutura clara e organizada**

## Seletores Identificados
- Container de concursos: Cada concurso em um card/box
- Títulos: Nomes das instituições (ANPD, CRMV-PI, COFFITO, etc.)
- Tipo: "Processo Seletivo Simplificado", "Concurso Público", "Seleção Pública"
- Datas de inscrição: "Inscrições: DD/MM/AAAA a DD/MM/AAAA"
- Links: "MAIS INFORMAÇÕES", "Consultar Local Prova"

## Concursos Visíveis
1. ANPD - Autoridade Nacional de Proteção de Dados
2. Conselho Regional de Medicina Veterinária do Piauí - CRMV-PI
3. Conselho Federal de Fisioterapia e Terapia Ocupacional - COFFITO
4. Centro Universitário do Planalto Central Apparecido dos Santos
5. Corpo de Bombeiros Militar do Distrito Federal
6. Escola de Saúde Pública do Distrito Federal
7. Conselho Federal de Medicina Veterinária - CFMV
8. Comissão Nacional de Energia Nuclear (CNEN)
9. EMPRESA BRASILEIRA DE CORREIOS E TELÉGRAFOS
10. EMATER - Empresa de Assistência Técnica
11. SECRETARIA DE ESTADO DE PLANEJAMENTO

## Solução
1. **Axios + Cheerio** - Scraping simples
2. Extrair cards de concursos
3. Parsear informações estruturadas

## Prioridade
- **ALTA** - Banca importante (Tier 2, prioridade 55)
- **FÁCIL** - Implementação simples

## Próximos Passos
- Implementar scraper com Axios
- Testar extração de dados
- Validar links e informações

## Notas
- Site bem estruturado e fácil de fazer scraping
- Sem proteções anti-bot
- Boa quantidade de concursos ativos (~11 visíveis)
