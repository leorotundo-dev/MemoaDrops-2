# MemoDrops v3 (TypeScript)

Arquitetura:
- **Fastify (API REST)**
- **BullMQ (worker assíncrono com Redis)**
- **PostgreSQL + pgvector** (busca semântica)
- **TypeScript / ES Modules**

## Requisitos
- Node.js 20+
- PostgreSQL 15/16 com extensão `pgvector`
- Redis 6/7

## Setup
```bash
cp env/.env.api.example .env
# edite DATABASE_URL e REDIS_URL

npm i
npm run migrate
npm run dev     # sobe API
# em outro terminal
npm run worker  # sobe workers
```

## Rotas
- `GET /health` — status
- `GET /concursos/search?q=...` — mock de busca de concursos
- `POST /concursos/sync` — { douUrl } → cria job de scraping
- `GET /jobs/:id` — status do job
- `GET /concursos/:contestId` — dados brutos
- `GET /concursos/:contestId/search?q=...` — busca semântica (pgvector)

## Fluxo
1) `/concursos/sync` cria job **scrape**  
2) Worker executa scraping → cria **materias** e **conteudos**  
3) Para cada conteúdo, cria job **vector** para gerar embeddings  
4) `GET /concursos/:id/search?q=` ordena por similaridade do vetor

## Scripts
- `npm run migrate` — aplica `src/db/migrations/001_initial_schema.sql`
- `npm run dev` — API com TSX
- `npm run worker` — workers com TSX
- `npm run build` — transpila para `dist`
- `npm run start` — roda API em `dist`

## Observações
- O scraper está **mockado** para evitar dependências de scraping real; plugar fonte oficial quando desejar.
- Para embeddings, você pode substituir a implementação mock por OpenAI facilmente em `src/services/embeddings.ts`.
