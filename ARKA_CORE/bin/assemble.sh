#!/usr/bin/env bash
set -euo pipefail
mkdir -p build
command -v yq >/dev/null 2>&1 || { echo "Install yq (mikefarah/yq)" >&2; exit 1; }
FILES=(
  ARKA_CORE/master-assembly.yaml
  profiles/dev.override.yaml
  ARKA_EXT/ARKAEXT01-SUBS-CI.yaml
)
yq ea '. as $item ireduce ({}; . * $item )' "${FILES[@]}" > build/assembly.yaml
echo "✅ assembly écrit dans build/assembly.yaml"