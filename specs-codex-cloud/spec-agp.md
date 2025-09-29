# AGP - Spécification Extension Droits pour Tests ARKA_OS

## Contexte
Phase de test et stabilisation du moteur ARKA_OS. Extension des droits AGP nécessaire pour valider le système de distribution de services LLM.

## Droits Actuels AGP
```yaml
agp_rights:
  action_sets: [control_ops, quality_ops]
  allow_paths: [features_all, meta_adr, meta_reports_agp]
  deny_paths: [secrets]
  net_access: restricted
```

## Extensions Proposées

### 1. Action Sets à Ajouter

#### Tests & Validation
```yaml
# Ajouter à ARKPR03-ACTION-SETS.yaml
test_ops: [TEST_CREATE, TEST_RUN, TEST_VALIDATE, TEST_REPORT]
monitoring_ops: [MONITOR_START, MONITOR_STOP, MONITOR_REPORT, SYSTEM_HEALTH_CHECK]
debug_ops: [DEBUG_SESSION, TRACE_CAPTURE, LOG_ANALYSIS, PERFORMANCE_PROFILE]
```

#### Gouvernance Étendue
```yaml
# Déjà existants mais à ajouter au profil AGP
workflow_ops: [WORKFLOW_PLAN]
review_ops: [REVIEW_DELIVERABLE]
governance_ops: [GATE_NOTIFY, GATE_BROADCAST, DECISION_PUBLISH, DECISION_ARCHIVE]
document_ops: [DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_UPDATE, DOCUMENT_ARCHIVE]
analysis_ops: [ANALYSIS_CREATE, ANALYSIS_RUN, ANALYSIS_PUBLISH]
```

### 2. Path Sets à Créer

#### Test Environment Paths
```yaml
# Ajouter à ARKPR04-PATH-SETS.yaml
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

### 3. Droits AGP Étendus

#### Version Étendue Proposée
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

### 4. Viewer/Éditeur Components

#### Action Sets pour UI/UX
```yaml
# Ajouter à ARKPR03-ACTION-SETS.yaml
viewer_ops: [VIEW_CONFIG, VIEW_RESULTS, VIEW_LOGS, VIEW_METRICS, EXPORT_VIEW]
editor_ops: [EDIT_CONFIG, EDIT_TEMPLATE, EDIT_RULES, VALIDATE_EDIT, SAVE_EDIT]
ui_ops: [UI_CREATE, UI_UPDATE, UI_RENDER, UI_VALIDATE]
```

#### Path Sets pour Interface
```yaml
# Ajouter à ARKPR04-PATH-SETS.yaml
ui_components:
  - "local/ui/**"
  - "local/views/**"
  - "local/editors/**"
  - "local/themes/**"

config_editor_paths:
  - "ARKA_OS/ARKA_AGENT/client/*/ARKAA*.yaml"  # Lecture seule
  - "local/config-drafts/**"  # Édition sandbox
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
# Ajouter à ARKORE13-TEMPLATES (via AGENT override)
ui_templates:
  config_editor: "file://local/templates/config-editor.html"
  log_viewer: "file://local/templates/log-viewer.html"
  metrics_dashboard: "file://local/templates/metrics-dashboard.html"
  test_results_viewer: "file://local/templates/test-results.html"
  adr_editor: "file://local/templates/adr-editor.md"
```

### 5. Nouveaux Action Keys

#### À Ajouter dans ARKORE12-ACTION-KEYS.yaml
```yaml
action_keys:
  # Tests & Validation
  ARKA_OS_TEST:
    description: "Tester composants ARKA_OS"
    path_template_ref: ARKORE08:path_templates.test_dir
    validation_ref: ARKORE09:naming_patterns.test_naming

  SYSTEM_HEALTH_CHECK:
    description: "Vérifier santé système ARKA_OS"
    outputs: ["health_report"]

  PERFORMANCE_PROFILE:
    description: "Profiler performance moteur"
    outputs: ["perf_metrics", "bottlenecks"]

  # Gouvernance
  AGP_GATE_CREATE:
    description: "Créer gate de validation AGP"
    inputs: ["gate_type", "criteria", "deadline"]

  AGP_DECISION_RECORD:
    description: "Enregistrer décision architecturale"
    inputs: ["decision_id", "context", "options", "decision", "rationale"]
    path_template_ref: ARKORE08:path_templates.adr_dir

  # Viewer/Éditeur
  CONFIG_VIEW:
    description: "Visualiser configuration ARKA_OS"
    inputs: ["config_type", "client_name"]
    outputs: ["config_view"]
    template_ref: ARKORE13:ui_templates.config_editor

  CONFIG_EDIT:
    description: "Éditer configuration en sandbox"
    inputs: ["config_path", "changes"]
    outputs: ["draft_config", "validation_report"]
    validation_ref: ARKORE09:naming_patterns.config_validation

  LOG_VIEW:
    description: "Visualiser logs système"
    inputs: ["log_type", "date_range", "filter"]
    outputs: ["formatted_logs"]
    template_ref: ARKORE13:ui_templates.log_viewer

  METRICS_DASHBOARD:
    description: "Afficher tableau de bord métriques"
    outputs: ["dashboard_view"]
    template_ref: ARKORE13:ui_templates.metrics_dashboard

  EXPORT_DATA:
    description: "Exporter données pour analyse"
    inputs: ["data_type", "format", "date_range"]
    outputs: ["export_file"]
```

### 5. Limites et Politiques

#### Limites pour Tests
```yaml
# Ajouter à ARKPR06-LIMITS.yaml
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
- Bumper ARKPR03 → 1.4.0 (nouveaux action_sets)
- Bumper ARKPR04 → 1.3.0 (nouveaux path_sets)
- Bumper ARKPR05 → 1.3.0 (nouveaux droits)
- Bumper ARKPR08 → 1.2.0 (profil modifié)

## Validation

### Tests Requis
1. **Résolution de références** : Vérifier que tous les `*_ref` se résolvent
2. **Autorisation** : Tester que les nouvelles actions sont autorisées
3. **Paths** : Vérifier accès aux nouveaux chemins
4. **Limits** : Tester respect des quotas

### Commandes de Test
```bash
# Tester résolution
node ARKA_CORE/bin/runner.mjs validate-refs

# Tester autorisation AGP étendue
bash bin/os-run.sh agp ARKA_OS_TEST '{"component":"event-bus"}'

# Tester monitoring
bash bin/os-run.sh agp SYSTEM_HEALTH_CHECK '{}'

# Tester viewer/éditeur
bash bin/os-run.sh agp CONFIG_VIEW '{"config_type":"wakeup","client_name":"acme"}'
bash bin/os-run.sh agp LOG_VIEW '{"log_type":"agp","date_range":"last_24h"}'
bash bin/os-run.sh agp METRICS_DASHBOARD '{}'
bash bin/os-run.sh agp EXPORT_DATA '{"data_type":"test_results","format":"json"}'
```

## Rollback Plan

En cas de problème :
1. Restaurer versions précédentes des fichiers ARKPR*
2. Rebuilder les bundles
3. Tester avec les droits de base

## Notes

- **Sécurité** : Tous les nouveaux droits respectent `deny_paths: [secrets]`
- **Scope** : Extensions focalisées sur tests/monitoring, pas de droits de production
- **Compatibilité** : Changements additifs, pas de breaking changes
- **Audit** : Toutes les actions étendues logged dans `.mem/agp/`

---
*Spec créée pour phase de test et stabilisation ARKA_OS - Version 1.0*