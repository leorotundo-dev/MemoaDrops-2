# MemoDrops — ULTIMATE v4

Tudo em um lugar: documentação, blueprint, Docker/CI e o projeto **pronto com OpenAI Embeddings**.

## Ordem de uso (rápida)

1) **Projeto pronto (OpenAI)** — pasta `03_project_openai_ready`
   ```bash
   cd 03_project_openai_ready
   cp env/.env.api.example .env
   # adicione:
   # OPENAI_API_KEY=sk-...
   # OPENAI_EMBED_MODEL=text-embedding-3-small
   npm i
   npm run migrate
   npm run dev    # API
   npm run worker # Workers (em outro terminal)
   ```

   **Testes**
   ```bash
   curl http://localhost:3001/health
   curl "http://localhost:3001/concursos/search?q=TRT"
   curl -X POST http://localhost:3001/concursos/sync -H "Content-Type: application/json" -d '{"douUrl":"https://www.in.gov.br/edital/123"}'
   curl http://localhost:3001/jobs/<jobId>
   curl "http://localhost:3001/concursos/<contestId>/search?q=crase"
   ```

2) **Deploy no Railway**
   - Em `01_docs_blueprint_guides/deployment/RAILWAY_DEPLOY.md` tem o passo a passo.
   - Serviços: API, Worker, Postgres (pgvector), Redis.
   - Start/Deploy Commands já sugeridos.

3) **Docker local**
   - Em `02_code/docker/` você tem `docker-compose.yml`, `Dockerfile.api` e `Dockerfile.worker`.
   ```bash
   cd 02_code/docker
   docker compose up -d --build
   ```

4) **CI/CD (GitHub Actions)**
   - Workflow em `02_code/.github/workflows/cicd.yml` (use `RAILWAY_TOKEN` em Secrets).

## Observações
- O schema usa `VECTOR(1536)` — compatível com `text-embedding-3-small`.
- Para 3072 dims, mude o schema e reprocessa embeddings.
- Os scrapers estão mockados por padrão; substitua por real quando quiser.
