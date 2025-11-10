#!/usr/bin/env bash
set -euo pipefail
PG_URL="$1"
FILE="$2"
psql "$PG_URL" -f "$FILE"
