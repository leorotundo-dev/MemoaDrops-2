# Docker & CI/CD — MemoDrops

## Local com docker-compose
```bash
cd docker
docker compose up -d --build
# API em http://localhost:3001
# Postgres em localhost:5432 (memodrops/memodrops)
# Redis em localhost:6379
```

> Rode as migrações (separado) ou inclua `npm run migrate` no entrypoint do container.

## Entrypoints separados
- **API**: `dist/server.js`
- **Worker**: `dist/worker.js` (gerado a partir de `src/worker.ts`)

## GitHub Actions
- Pipeline `build-test` (build + tests)
- `deploy-railway`: requer `RAILWAY_TOKEN` em **Settings → Secrets → Actions**

## Dicas
- Ajuste `CORS_ORIGIN` para seu domínio real.
- Para usar embeddings reais, troque a função de embed no código e exporte a dimensão correta no schema `VECTOR(n)`.
