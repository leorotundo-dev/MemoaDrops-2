# Análise FUNDATEC

## URL Principal
- Site: https://www.fundatec.org.br
- Inscrições abertas: https://www.fundatec.org.br/portal/concursos/concursos_abertos.php

## Estrutura
- ✅ **HTML Estático** - Sem JavaScript obrigatório
- ✅ **Sem proteção Cloudflare**
- ✅ **Estrutura clara com links diretos**

## Seletores Identificados
- Container: Lista de concursos na seção "Inscrições Abertas"
- Títulos: Nomes em negrito (Município de Coqueiral/MG, Polícia Civil, etc.)
- Subtítulos: "Processo Seletivo Público nº XX/AAAA", "Concurso Público Nº XX/AAAA"
- Links: Cada concurso tem um link clicável

## Concursos Visíveis
1. INSTITUTO FEDERAL DE EDUCAÇÃO, CIÊNCIA E TECNOLOGIA DO NORTE DE MINAS GERAIS
2. Município de Coqueiral/MG
3. Município de Soledade/RS
4. CREF2 - CONSELHO REGIONAL DE EDUCAÇÃO FÍSICA
5. Polícia Civil - Delegado de Polícia
6. DPE/SC - Defensoria Pública de Santa Catarina
7. Polícia Civil - Escrivão e Inspetor
8. Exame POSCOMP 2025
9. GHC - Grupo Hospitalar Conceição
10. Prefeitura Municipal de Agudo/RS
11. Prefeitura Municipal de Estação/RS
12. Prefeitura Municipal de Gravataí/RS
13. Prefeitura Municipal de Imbé/RS
14. Prefeitura Municipal de Jaguari/RS
15. Prefeitura Municipal de Porto Mauá/RS
16. PROVA AMB, AMRIGS, ACM E AMMS
17. UERGS - Universidade Estadual do Rio Grande do Sul
18. UFRGS - Universidade Federal do Rio Grande do Sul

## Solução
1. **Axios + Cheerio** - Scraping simples
2. Extrair lista de links e títulos
3. Parsear informações estruturadas

## Prioridade
- **ALTA** - Banca importante (Tier 2, prioridade 50)
- **FÁCIL** - Implementação simples
- **ALTO VOLUME** - ~18 concursos ativos

## Próximos Passos
- Implementar scraper com Axios
- Testar extração de dados
- Validar links e informações

## Notas
- Site bem estruturado e fácil de fazer scraping
- Sem proteções anti-bot
- Grande quantidade de concursos ativos
- Principal banca do Rio Grande do Sul
