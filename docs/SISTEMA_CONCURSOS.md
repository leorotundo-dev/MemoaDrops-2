# Sistema de Descoberta de Concursos por Banca

Este documento descreve a implementação do sistema de descoberta automática de concursos por banca no MemoDrops.

## 1. Visão Geral

O sistema foi criado para resolver o problema de não haver concursos associados às bancas no Admin Dashboard. Ele consiste em:

- **Endpoints na API**: Para listar concursos de uma banca e executar o scraper.
- **Scraper de Descoberta**: Um serviço que busca novos concursos nos sites das bancas.
- **Fluxo Completo**: Desde a descoberta do concurso até a extração de matérias.

## 2. Estrutura do Banco de Dados

- Adicionada coluna `banca_id` na tabela `concursos`.
- Criada **foreign key** para relacionar `concursos.banca_id` com `bancas.id`.

## 3. Endpoints da API

### Listagem e Estatísticas

- `GET /admin/bancas/:id/contests`: Lista os concursos de uma banca específica.
- `GET /admin/bancas/:id/stats`: Retorna estatísticas de concursos por ano para uma banca.

### Execução do Scraper

- `POST /admin/scrape-contests/:bancaId`: Executa o scraper para uma banca específica.
- `POST /admin/scrape-contests/all`: Executa o scraper para todas as bancas ativas.

## 4. Scraper de Descoberta de Concursos

O serviço `contest-discovery-scraper.ts` é responsável por:

1.  **Buscar Bancas Ativas**: Pega todas as bancas ativas do banco de dados.
2.  **Acessar Site da Banca**: Usa URLs mapeadas para acessar a página de concursos de cada banca.
3.  **Parse HTML**: Usa `cheerio` para extrair links de concursos do HTML.
4.  **Salvar no Banco**: Salva os concursos descobertos no banco, evitando duplicatas.
5.  **Atualizar Contador**: Atualiza o campo `total_contests` na tabela `bancas`.

### Bancas Suportadas (v1):

- CEBRASPE
- FCC
- FGV
- VUNESP
- CESGRANRIO
- QUADRIX
- IBFC
- AOCP

## 5. Fluxo de Uso

1.  **Descoberta Automática**: O scraper é executado (manualmente ou agendado) e popula o banco com novos concursos.
2.  **Visualização no Admin**: O usuário acessa a página de uma banca e vê a lista de concursos encontrados.
3.  **Seleção do Concurso**: O usuário clica em um concurso para ver mais detalhes.
4.  **Extração de Matérias**: O scraper existente (`scraper.ts`) é acionado com a URL do concurso para extrair as matérias e conteúdos.

## 6. Próximos Passos

- **Agendamento Automático**: Criar um job para executar o scraper de descoberta periodicamente (ex: a cada 24 horas).
- **Melhorar Seletores**: Ajustar os seletores CSS para cada banca, aumentando a precisão da busca.
- **Interface de Gerenciamento**: Criar uma interface no Admin para gerenciar os scrapers e ver os resultados.
