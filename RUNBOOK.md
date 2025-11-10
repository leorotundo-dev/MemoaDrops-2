# Runbook – MemoDrops API

## Incidentes comuns
1) **Fila LLM parou de aceitar jobs**  
   - Verificar Redis (conexão/latência).  
   - Checar dashboard `/queues` e DLQ `llm-dlq`.  
   - Se houver jobs stuck, pausar worker, reprocessar, e abrir issue.  

2) **Erro 5xx em produção**  
   - Conferir `/health` e `/metrics`.  
   - Ver logs estruturados (Pino/Datadog) e Sentry (DSN configurado).  
   - Se smoke falhar após deploy, rodar `scripts/rollback.sh`.  

3) **Notificações não estão indo**  
   - Checar `notificationsQueue` e tokens em `user_devices`.  
   - Validar `FCM_SERVER_KEY` e quotas.

## Comandos úteis
- **Smoke local**: `bash scripts/smoke.sh http://localhost:3001`
- **Backup**: workflow `nightly-backup.yml` ou `pg_dump` manual.
- **Metrics**: Prometheus scrapes `/metrics`; Grafana usa dashboard próprio.

## Variáveis sensíveis
- `SENTRY_DSN`, `PG_URL`, `REDIS_URL`, `FCM_SERVER_KEY`, `GOOGLE_CLIENT_ID` etc.
