# AGP - SpÃ©cification Extension Droits pour Tests ARKA_OS

## Contexte
Phase de test et stabilisation du moteur ARKA_OS. Extension des droits AGP nÃ©cessaire pour valider le systÃ¨me de distribution de services LLM.

## Droits Actuels AGP
```yaml
agp_rights:
  action_sets: [control_ops, quality_ops]
  allow_paths: [features_all, meta_adr, meta_reports_agp]
  deny_paths: [secrets]
  net_access: restricted
```

## Extensions ProposÃ©es

### 1. Action Sets Ã  Ajouter

#### Tests & Validation
```yaml
# Ajouter Ã  ARKPR03-ACTION-SETS.yaml
test_ops: [TEST_CREATE, TEST_RUN, TEST_VALIDATE, TEST_REPORT]
monitoring_ops: [MONITOR_START, MONITOR_STOP, MONITOR_REPORT, SYSTEM_HEALTH_CHECK]
debug_ops: [DEBUG_SESSION, TRACE_CAPTURE, LOG_ANALYSIS, PERFORMANCE_PROFILE]
```

#### Gouvernance Ã‰tendue
```yaml
# DÃ©jÃ  existants mais Ã  ajouter au profil AGP     
workflow_ops: [WORKFLOW_PLAN]
review_ops: [REVIEW_DELIVERABLE]
governance_ops: [GATE_NOTIFY, GATE_BROADCAST, DECISION_PUBLISH, DECISION_ARCHIVE]
document_ops: [DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_UPDATE, DOCUMENT_ARCHIVE]
analysis_ops: [ANALYSIS_CREATE, ANALYSIS_RUN, ANALYSIS_PUBLISH]
```

### 2. Path Sets Ã  CrÃ©er

#### Test Environment Paths
```yaml
# Ajouter Ã  ARKPR04-PATH-SETS.yaml
test_environment:
  - "tests/**"
  - "local/test-results/**"
  - "local/reports/**"
  - ".mem/test/**"

debug_paths:
  - "local/debug/**"
  - "local/logs/**"
  - "local/traces/**"

monitoring_paths:
  - "local/monitoring/**"
  - "local/metrics/**"
  - ".mem/agp/monitoring/**"
```

### 3. Droits AGP Ã‰tendus

#### Version Ã‰tendue ProposÃ©e
```yaml
# Modification dans ARKPR05-RIGHTS.yaml
agp_extended_rights:
  action_sets: [
    control_ops,
    quality_ops,
    workflow_ops,
    review_ops,
    governance_ops,
    document_ops,
    analysis_ops,
    test_ops,
    monitoring_ops,
    debug_ops,
    viewer_ops,
    editor_ops,
    ui_ops
  ]
  allow_paths: [
    features_all,
    meta_adr,
    meta_reports_agp,
    test_environment,
    debug_paths,
    monitoring_paths,
    ui_components,
    config_editor_paths,
    viewer_data_paths,
    mem_only
  ]
  deny_paths: [secrets]
  net_access: restricted
```

### 4. Viewer/Ã‰diteur Components

#### Action Sets pour UI/UX
```yaml
# Ajouter Ã  ARKPR03-ACTION-SETS.yaml
viewer_ops: [VIEW_CONFIG, VIEW_RESULTS, VIEW_LOGS, VIEW_METRICS, EXPORT_VIEW]
editor_ops: [EDIT_CONFIG, EDIT_TEMPLATE, EDIT_RULES, VALIDATE_EDIT, SAVE_EDIT]
ui_ops: [UI_CREATE, UI_UPDATE, UI_RENDER, UI_VALIDATE]
```

#### Path Sets pour Interface
```yaml
# Ajouter Ã  ARKPR04-PATH-SETS.yaml
ui_components:
  - "local/ui/**"
  - "local/views/**"
  - "local/editors/**"
  - "local/themes/**"

config_editor_paths:
  - "ARKA_OS/ARKA_AGENT/client/*/ARKAA*.yaml"  # Lecture seule
  - "local/config-drafts/**"  # Ã‰dition sandbox     
  - "local/config-backups/**"

viewer_data_paths:
  - "local/reports/**"
  - "local/test-results/**"
  - "local/logs/**"
  - ".mem/agp/**"
  - "local/exports/**"
```

#### Templates pour Interface
```yaml
# Ajouter Ã  ARKORE13-TEMPLATES (via AGENT override) 
ui_templates:
  config_editor: "file://local/templates/config-editor.html"
  log_viewer: "file://local/templates/log-viewer.html"
  metrics_dashboard: "file://local/templates/metrics-dashboard.html"
  test_results_viewer: "file://local/templates/test-results.html"
  adr_editor: "file://local/templates/adr-editor.md" 
```

### 5. Nouveaux Action Keys

#### Ã€ Ajouter dans ARKORE12-ACTION-KEYS.yaml       
```yaml
action_keys:
  # Tests & Validation
  ARKA_OS_TEST:
    description: "Tester composants ARKA_OS"
    path_template_ref: ARKORE08:path_templates.test_dir
    validation_ref: ARKORE09:naming_patterns.test_naming

  SYSTEM_HEALTH_CHECK:
    description: "VÃ©rifier santÃ© systÃ¨me ARKA_OS" 
    outputs: ["health_report"]

  PERFORMANCE_PROFILE:
    description: "Profiler performance moteur"       
    outputs: ["perf_metrics", "bottlenecks"]

  # Gouvernance
  AGP_GATE_CREATE:
    description: "CrÃ©er gate de validation AGP"     
    inputs: ["gate_type", "criteria", "deadline"]    

  AGP_DECISION_RECORD:
    description: "Enregistrer dÃ©cision architecturale"
    inputs: ["decision_id", "context", "options", "decision", "rationale"]
    path_template_ref: ARKORE08:path_templates.adr_dir

  # Viewer/Ã‰diteur
  CONFIG_VIEW:
    description: "Visualiser configuration ARKA_OS"  
    inputs: ["config_type", "client_name"]
    outputs: ["config_view"]
    template_ref: ARKORE13:ui_templates.config_editor

  CONFIG_EDIT:
    description: "Ã‰diter configuration en sandbox"  
    inputs: ["config_path", "changes"]
    outputs: ["draft_config", "validation_report"]   
    validation_ref: ARKORE09:naming_patterns.config_validation

  LOG_VIEW:
    description: "Visualiser logs systÃ¨me"
    inputs: ["log_type", "date_range", "filter"]     
    outputs: ["formatted_logs"]
    template_ref: ARKORE13:ui_templates.log_viewer   

  METRICS_DASHBOARD:
    description: "Afficher tableau de bord mÃ©triques"
    outputs: ["dashboard_view"]
    template_ref: ARKORE13:ui_templates.metrics_dashboard

  EXPORT_DATA:
    description: "Exporter donnÃ©es pour analyse"    
    inputs: ["data_type", "format", "date_range"]    
    outputs: ["export_file"]
```

### 5. Limites et Politiques

#### Limites pour Tests
```yaml
# Ajouter Ã  ARKPR06-LIMITS.yaml
agp_test_limits:
  ratelimit:
    test_runs_per_hour: 50
    debug_sessions_per_day: 10
    performance_profiles_per_day: 5
    config_edits_per_hour: 20
    view_requests_per_minute: 100
    exports_per_day: 50
  quotas:
    max_test_files: 1000
    max_debug_log_size_mb: 100
    max_monitoring_retention_days: 7
    max_config_drafts: 50
    max_export_file_size_mb: 500
    max_ui_cache_size_mb: 200
```

## Activation

### 1. Modifier le Profil AGP
```yaml
# Dans ARKPR08-PROFILES-CATALOG.yaml, remplacer :    
agp:
  right_ref: ARKPR05-RIGHTS:agp_extended_rights  # Au lieu de agp_rights
  action_sets: [quality_ops, workflow_ops, review_ops, test_ops, monitoring_ops, viewer_ops, editor_ops, ui_ops]
  limits_ref: ARKPR06-LIMITS:agp_test_limits
```

### 2. Update Version
- Bumper ARKPR03 â†’ 1.4.0 (nouveaux action_sets)    
- Bumper ARKPR04 â†’ 1.3.0 (nouveaux path_sets)      
- Bumper ARKPR05 â†’ 1.3.0 (nouveaux droits)
- Bumper ARKPR08 â†’ 1.2.0 (profil modifiÃ©)

## Validation

### Tests Requis
1. **RÃ©solution de rÃ©fÃ©rences** : VÃ©rifier que tous les `*_ref` se rÃ©solvent
2. **Autorisation** : Tester que les nouvelles actions sont autorisÃ©es
3. **Paths** : VÃ©rifier accÃ¨s aux nouveaux chemins 
4. **Limits** : Tester respect des quotas

### Commandes de Test
```bash
# Tester rÃ©solution
node ARKA_CORE/bin/runner.mjs validate-refs

# Tester autorisation AGP Ã©tendue
bash bin/os-run.sh agp ARKA_OS_TEST '{"component":"event-bus"}'

# Tester monitoring
bash bin/os-run.sh agp SYSTEM_HEALTH_CHECK '{}'      

# Tester viewer/Ã©diteur
bash bin/os-run.sh agp CONFIG_VIEW '{"config_type":"wakeup","client_name":"acme"}'
bash bin/os-run.sh agp LOG_VIEW '{"log_type":"agp","date_range":"last_24h"}'
bash bin/os-run.sh agp METRICS_DASHBOARD '{}'        
bash bin/os-run.sh agp EXPORT_DATA '{"data_type":"test_results","format":"json"}'
```

## Rollback Plan

En cas de problÃ¨me :
1. Restaurer versions prÃ©cÃ©dentes des fichiers ARKPR*
2. Rebuilder les bundles
3. Tester avec les droits de base

## Notes

- **SÃ©curitÃ©** : Tous les nouveaux droits respectent `deny_paths: [secrets]`
- **Scope** : Extensions focalisÃ©es sur tests/monitoring, pas de droits de production
- **CompatibilitÃ©** : Changements additifs, pas de breaking changes
- **Audit** : Toutes les actions Ã©tendues logged dans `.mem/agp/`

---
*Spec crÃ©Ã©e pour phase de test et stabilisation ARKA_OS - Version 1.0*

