#!/usr/bin/env bash
set -euo pipefail
PG_URL="$1"  # postgres://user:pass@host:port/db
STAMP=$(date +%Y%m%d_%H%M%S)
pg_dump "$PG_URL" > "backup_${STAMP}.sql"
echo "Backup salvo: backup_${STAMP}.sql"
