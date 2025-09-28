set -euo pipefail
# 1) CORE
mkdir -p ARKA_CORE/build
yq ea '. as $i ireduce ({}; . * $i )' \
  ARKA_CORE/ARKORE00-INDEX.yaml ARKA_CORE/master-assembly.yaml ARKA_CORE/bricks/*.yaml \
  > ARKA_CORE/build/core.assembly.yaml
# 2) PROFIL
mkdir -p ARKA_PROFIL/build
yq ea '. as $i ireduce ({}; . * $i )' \
  ARKA_PROFIL/PROFILES00-INDEX.yaml ARKA_PROFIL/master-profiles.yaml ARKA_PROFIL/bricks/*.yaml \
  > ARKA_PROFIL/build/profiles.bundle.yaml
# 3) AGENT
mkdir -p ARKA_AGENT/build
yq ea '. as $i ireduce ({}; . * $i )' \
  ARKA_AGENT/AGENT00-INDEX.yaml ARKA_AGENT/master-agent.yaml ARKA_AGENT/client/acme/*.yaml \
  > ARKA_AGENT/build/assembly.yaml
echo "✅ Build done"; ls -1 ARKA_*/build/*.yaml
