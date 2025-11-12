# Análise IDECAN

## URL Principal
- Site: https://idecan.org.br
- Concursos: https://concurso.idecan.org.br

## Proteção
- ❌ **Cloudflare Challenge** (Captcha)
- Requer verificação humana antes de acessar
- Impossível fazer scraping direto

## Solução
1. **Puppeteer Stealth** - Bypass do Cloudflare
2. **Puppeteer Extra + Plugin Stealth**
3. **Aguardar carregamento completo** antes de extrair dados

## Prioridade
- **ALTA** - Banca importante (Tier 2, prioridade 60)

## Próximos Passos
- Implementar Puppeteer Stealth
- Testar bypass do Cloudflare
- Extrair lista de concursos em andamento

## Notas
- Site usa Cloudflare para proteção anti-bot
- Mesma proteção que CESGRANRIO, AOCP, IBFC
- Precisamos de solução genérica para Cloudflare
