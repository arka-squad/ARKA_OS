$ErrorActionPreference = "Stop"
# 1) CORE
mkdir -Force ARKA_CORE/build | Out-Null
yq ea '. as $i ireduce ({}; . * $i )' `
  ARKA_CORE/ARKORE00-INDEX.yaml ARKA_CORE/master-assembly.yaml ARKA_CORE/bricks/*.yaml `
  > ARKA_CORE/build/core.assembly.yaml

# 2) PROFIL
mkdir -Force ARKA_PROFIL/build | Out-Null
yq ea '. as $i ireduce ({}; . * $i )' `
  ARKA_PROFIL/PROFILES00-INDEX.yaml ARKA_PROFIL/master-profiles.yaml ARKA_PROFIL/bricks/*.yaml `
  > ARKA_PROFIL/build/profiles.bundle.yaml

# 3) AGENT (client par défaut: acme)
mkdir -Force ARKA_AGENT/build | Out-Null
yq ea '. as $i ireduce ({}; . * $i )' `
  ARKA_AGENT/AGENT00-INDEX.yaml ARKA_AGENT/master-agent.yaml ARKA_AGENT/client/acme/*.yaml `
  > ARKA_AGENT/build/assembly.yaml

Write-Host "✅ Build done:"
Get-ChildItem ARKA_*/build/*.yaml | Format-Table -AutoSize
