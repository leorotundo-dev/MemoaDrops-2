#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-http://localhost:3001}"
code=0
curl -fsS "$BASE_URL/health" >/dev/null || code=1
curl -fsS "$BASE_URL/metrics" >/dev/null || code=1
curl -fsS "$BASE_URL/docs" >/dev/null || code=1
if [ "$code" -ne 0 ]; then
  echo "Smoke FAILED"; exit 1
else
  echo "Smoke OK"
fi
