# Revisão Completa dos Scrapers do MemoDrops

Este documento detalha a revisão de todos os scrapers do sistema MemoDrops, incluindo testes de funcionalidade e recomendações de melhorias.

## 1. Tipos de Scrapers

O MemoDrops possui dois tipos principais de scrapers:

### 1.1. Scraper de Descoberta de Concursos (`contest-discovery-scraper.ts`)

**Função**: Busca automaticamente novos concursos nos sites das bancas organizadoras.

**Bancas Suportadas**:
- CEBRASPE
- FCC (Fundação Carlos Chagas)
- FGV (Fundação Getúlio Vargas)
- VUNESP
- CESPE
- IBFC
- IDECAN
- IADES

**Como Funciona**:
1. Acessa o site da banca
2. Busca por links e informações de concursos abertos
3. Extrai nome, URL do DOU e outras informações
4. Salva no banco de dados com `banca_id` correto

### 1.2. Scraper de Extração de Conteúdo (`scraper.ts` + adapters)

**Função**: Extrai matérias, conteúdos programáticos e questões de um concurso específico.

**Adapters Disponíveis**:

| Categoria | Adapters | Descrição |
| :--- | :--- | :--- |
| **DOU** | `dou.ts` | Extrai informações do Diário Oficial da União |
| **Bancas** | (diretório `bancas/`) | Adapters específicos para cada banca |
| **Federal** | (diretório `federal/`) | Concursos federais |
| **Estaduais** | (diretório `estaduais/`) | Concursos estaduais |
| **Municipais** | (diretório `municipais/`) | Concursos municipais |
| **Justiça** | (diretório `justica/`) | Concursos do poder judiciário |
| **Fallback** | (diretório `fallback/`) | Adapter genérico quando não há específico |

## 2. Testes Realizados

### 2.1. Teste do Scraper de Descoberta

**Data**: 12/11/2025  
**Método**: Teste individual de cada banca com script automatizado

**Resultados Detalhados**:

| Banca | Status | Links Encontrados | Observação |
| :--- | :---: | :---: | :--- |
| FCC | ✅ Sucesso | 12 | Funcionando perfeitamente |
| FGV | ✅ Sucesso | 39 | Funcionando perfeitamente |
| CEBRASPE | ⚠️ Sem resultados | 0 | Página carrega mas seletores não encontram links |
| QUADRIX | ⚠️ Sem resultados | 0 | Página carrega mas seletores não encontram links |
| VUNESP | ❌ Erro | 0 | HTTP 404 - URL inválida |
| CESGRANRIO | ❌ Erro | 0 | HTTP 403 - Bloqueio de bot |
| IBFC | ❌ Erro | 0 | HTTP 403 - Bloqueio de bot |
| AOCP | ❌ Erro | 0 | HTTP 403 - Bloqueio de bot |

**Resumo**:
- ✅ **Funcionando**: 2 bancas (25%)
- ⚠️ **Sem resultados**: 2 bancas (25%)
- ❌ **Com erros**: 4 bancas (50%)

### 2.2. Teste dos Adapters de Extração

**Status**: Revisão completa da arquitetura

**Adapters Disponíveis**: 40+ adapters para diferentes fontes

| Categoria | Quantidade | Exemplos |
| :--- | :---: | :--- |
| **Bancas** | 12 | CEBRASPE, FGV, VUNESP, FCC, IBFC, AOCP, etc. |
| **Federal** | 5 | DOU, Gov.br Portal, SEI, Compras Portal, LexML |
| **Estaduais** | 27 | DOE de todos os estados brasileiros |
| **Justiça** | 2 | TRF, TRT |
| **Municipais** | 4 | DOM FECAM, DOM AM, IOM, DOM Cidades |
| **Fallback** | 1 | Adapter genérico para sites não mapeados |

**Observação**: Os adapters de extração têm uma cobertura excelente, mas precisam de testes individuais para validar cada um.

## 3. Problemas Identificados e Soluções

### 3.1. Scraper de Descoberta

#### Problema 1: Bloqueio de Bots (HTTP 403)
**Bancas Afetadas**: CESGRANRIO, IBFC, AOCP

**Causa**: Sites estão bloqueando requisições automatizadas.

**Soluções Possíveis**:
1. Usar Puppeteer/Playwright para simular navegador real
2. Implementar rotação de User-Agents
3. Adicionar delays entre requisições
4. Usar proxies rotativos

#### Problema 2: URL Inválida (HTTP 404)
**Bancas Afetadas**: VUNESP

**Causa**: URL de concursos mudou ou foi removida.

**Solução**: Atualizar URL no mapeamento `BANCA_CONTEST_URLS`.

#### Problema 3: Seletores CSS Desatualizados
**Bancas Afetadas**: CEBRASPE, QUADRIX

**Causa**: Sites mudaram de estrutura HTML.

**Solução**: Inspecionar sites manualmente e atualizar seletores CSS específicos para cada banca.

### 3.2. Adapters de Extração

**Status**: Arquitetura sólida, mas necessita testes individuais

**Recomendações**:
1. Criar suite de testes automatizados para cada adapter
2. Implementar sistema de monitoramento de falhas
3. Adicionar logs detalhados para debug
4. Criar fallback automático para adapter genérico

## 4. Recomendações Prioritárias

### 4.1. Curto Prazo (1-2 semanas)

1. **Corrigir URL da VUNESP**: Pesquisar e atualizar a URL correta de concursos
2. **Implementar Puppeteer**: Adicionar suporte a navegador headless para contornar bloqueios HTTP 403
3. **Atualizar Seletores**: Revisar e atualizar seletores CSS para CEBRASPE e QUADRIX
4. **Melhorar Logs**: Adicionar logs detalhados em todos os scrapers para facilitar debug

### 4.2. Médio Prazo (1 mês)

1. **Testes Automatizados**: Criar suite de testes para validar cada adapter periodicamente
2. **Monitoramento**: Implementar dashboard para acompanhar taxa de sucesso dos scrapers
3. **Rotação de User-Agents**: Implementar sistema de rotação para evitar bloqueios
4. **Retry Logic**: Adicionar lógica de retry com backoff exponencial

### 4.3. Longo Prazo (3 meses)

1. **Machine Learning**: Treinar modelo para identificar automaticamente estruturas de editais
2. **Scraping Distribuído**: Implementar sistema de filas para processar múltiplos concursos em paralelo
3. **API de Notificações**: Criar sistema de alertas quando novos concursos são descobertos
4. **Interface de Gerenciamento**: Dashboard admin para gerenciar scrapers e visualizar logs

## 5. Conclusão

O sistema de scrapers do MemoDrops possui uma arquitetura robusta e bem estruturada, com mais de 40 adapters cobrindo praticamente todas as fontes de concursos públicos no Brasil. No entanto, a taxa de sucesso atual dos scrapers de descoberta (25%) indica que há espaço significativo para melhorias.

As principais ações recomendadas são:

1. **Implementar Puppeteer** para contornar bloqueios de bots
2. **Atualizar seletores CSS** para bancas que não estão retornando resultados
3. **Criar sistema de monitoramento** para identificar falhas rapidamente
4. **Implementar testes automatizados** para garantir qualidade contínua

Com essas melhorias, a taxa de sucesso pode aumentar de 25% para 80-90%, garantindo uma cobertura muito mais ampla de concursos públicos.
