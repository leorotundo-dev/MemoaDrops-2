# Deploy no Railway — MemoDrops v3

Serviços: API (Fastify), Worker (BullMQ), Postgres (pgvector), Redis.
Vars por serviço, comandos de build/start e teste end-to-end:

API
- Deploy Command: npm ci && npm run build && npm run migrate
- Start Command: npm run start

Worker
- Start Command: node dist/server.js

Teste:
1) GET /health
2) GET /concursos/search?q=TRT
3) POST /concursos/sync {douUrl}
4) GET /jobs/:id -> completed -> contestId
5) GET /concursos/:contestId
6) GET /concursos/:contestId/search?q=crase
