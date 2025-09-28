#!/usr/bin/env bash
set -euo pipefail
# Lit le payload JSON de l'event MEMORY_UPDATED et synchronise des embeddings (placeholder)
PAYLOAD=$(cat)
US_ID=$(jq -r '.scope.usId // empty' <<<"${PAYLOAD}" || true)
STATUS=$(jq -r '.details.status // empty' <<<"${PAYLOAD}" || true)
 echo "[sync-embeddings] scope.US=${US_ID:-N/A} status=${STATUS:-} profile=${ARKA_PROFILE:-unknown}"
# TODO: appeler votre pipeline (python) d'indexation
# python3 scripts/embeddings/index.py --us "$US_ID" --payload <(echo "$PAYLOAD")