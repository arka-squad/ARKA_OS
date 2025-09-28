AGENT="${1:-lead-dev-batisseur}"
ACTION="${2:-US_CREATE}"
INPUT_JSON='{"featureId":"FEAT-12","epicId":"EPIC-01","usId":"US-EPIC-01-01","title":"export CSV","kebab_title":"export-csv"}'
RUNNER="${RUNNER:-ARKA_CORE/bin/runner.mjs}"

node "$RUNNER" \
  --core   "ARKA_CORE/build/core.assembly.yaml" \
  --profil "ARKA_PROFIL/build/profiles.bundle.yaml" \
  --agent  "ARKA_AGENT/build/assembly.yaml" \
  "$ACTION" "$INPUT_JSON" \
  --as-agent "$AGENT"
