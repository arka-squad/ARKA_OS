# 📊 ANALYSE PATTERN AGP/PMO - Répartition Wake/Profil/Client
*Document de catégorisation - ARKA_OS v2.0.0*

---

## 🔴 WAKE-UP (reste dans le fichier wake-up)

```yaml
# IDENTIFIANTS
- id: ARKAA08-WAKEUP-{AGENT}
- version: X.X.X
- agent_id: arka-agent-XX-{name}

# ANTI-DÉRIVE (du PMO)
- loading_policy:
  - forbidden_deep_scan: true
  - allowed_refs_only: true
  - auto_resolve_refs: false
  
- access_controls:
  - repository_scan: forbidden
  - cross_agent_access: forbidden
  - fallback_on_missing: "STOP"

- validation:
  - require_explicit_intent: true
  - block_undeclared_actions: true
  - missing_ref_policy: "report_and_stop"

- on_missing_reference:
  - action: "STOP"
  - message: "Reference ${ref} not found"
  - suggest: "Create missing reference"

# 🔴🔴🔴 RÉFÉRENCE OBLIGATOIRE - NE PAS CONTINUER SANS L'AVOIR LUE 🔴🔴🔴
- use_profile_ref: ARKPR08-PROFILES-CATALOG:profiles.{agent}  # CRITIQUE ! Ton identité complète est là !

# RÉFÉRENCES PROJET
- project_context_ref: ARKAA21-PROJECT-CONTEXT:vars

# MÉMOIRE
- memory:
  - dir: ARKA_META/.system/.mem/{agent}/
  - index: ARKA_META/.system/.mem/{agent}/index.json

# CONTEXTE PROJET
- context:
  - docs_ref:
    - vision_produit: ARKAA21-PROJECT-CONTEXT:vars.docs.vision_produit
    - roadmap: ARKAA21-PROJECT-CONTEXT:vars.docs.roadmap
    - plan_directeur: ARKAA21-PROJECT-CONTEXT:vars.docs.plan_directeur

# RÉFÉRENCES CONTEXTE (PMO)
- context_refs:
  - plan_directeur_ref: ARKAA15-PLAN-DIRECTEUR:director_plan
  - templates_provider_ref: ARKAA11-TEMPLATES-PROVIDER
  - experts_cards_dir: client/acme/experts/
```

---

## 🔵 PROFIL (à déplacer dans le profil expert)

```yaml
# 🔴🔴🔴 GOUVERNANCE CRITIQUE 🔴🔴🔴
- orchestration_rules_ref: ARKORE17-ORCHESTRATION-RULES:exports  # OBLIGATOIRE - Prérequis des intents !

# INTENTS (GOUVERNANCE) - Toujours APRÈS orchestration_rules_ref !
- available_intents:
  - GATE_NOTIFY
  - ORDER_CREATE
  - DECISION_PUBLISH
  - DOCUMENT_CREATE
  - FEATURE_CREATE
  - EPIC_CREATE
  - US_CREATE
  - WORKFLOW_PLAN
  - REPORT_CREATE
  - TICKET_CREATE
  - ORDER_ASSIGN
  - MISSION_INGEST
  - REVIEW_DELIVERABLE
  - VALIDATE_NAMING

- include_common_intents_ref: ARKPR20-WAKEUP-POLICIES:exports.intents_common

# CAPABILITIES
- capabilities_ref: client/acme/ARKAA19-AGENT-CAPABILITIES.yaml#agents.{agent}
- keys_catalog_ref: ARKORE11-KEYS-ANNUAIRE:keys

# RÈGLES & GOUVERNANCE
- rules_version_ref: ARKPR20-WAKEUP-POLICIES:exports.rules_version
- rules_index_ref: ARKPR20-WAKEUP-POLICIES:exports.rules_index_ref
- guardrails_ref: ARKPR20-WAKEUP-POLICIES:exports.guardrails

# STARTUP & COMPORTEMENT
- startup:
  - sequence: [resolve_profile, mount_memory, load_capabilities, load_keys_catalog]
  - default_intent: US_CREATE
  - dispatch_mode: subtasks_only

- delegation:
  - method: Task

# FALLBACK (comportement par défaut)
- fallback_context:
  - vision_produit: "À créer dans INPUT/"
  - roadmap: "À créer dans INPUT/"

- fallback_rules:
  - version: "1.0.0"
  - guardrails: "standard"

# RÉTENTION
- retention_days: 365
```

---

## 🟢 CLIENT (configuration client spécifique)

```yaml
# PROVIDERS (spécifique client)
- providers:
  - chat_multi_provider_ref: ARKAA21-PROJECT-CONTEXT:vars.providers.chat_multi_provider
  - must_log_provider_ref: ARKAA21-PROJECT-CONTEXT:vars.providers.must_log_provider

# CONTEXTE BUSINESS
- governance_ref: ARKAA21-PROJECT-CONTEXT:vars.governance
- dor_dod_ref: ARKAA21-PROJECT-CONTEXT:vars.dor_dod

# CONTEXTE DOCUMENTAIRE ÉTENDU
- vision_slice: ARKAA21-PROJECT-CONTEXT:vars.docs.vision_slice_template
- pitch_deck: ARKAA21-PROJECT-CONTEXT:vars.docs.pitch_deck

# STYLE & COMMUNICATION
- language_tone_ref: ARKAA21-PROJECT-CONTEXT:vars.language_tone
- workflow_canvas_ref: ARKAA21-PROJECT-CONTEXT:vars.workflow_canvas
```

---

## 📊 RÉSUMÉ DE LA RÉPARTITION

| Catégorie | Nombre d'éléments | Type |
|-----------|-------------------|------|
| **WAKE-UP** | ~20 éléments | Contrôles, **PROFILE REF OBLIGATOIRE**, Mémoire, Contexte projet |
| **PROFIL** | ~15 éléments | **ORCHESTRATION RULES + INTENTS (couple)**, Gouvernance, Capabilities |
| **CLIENT** | ~8 éléments | Providers, Business context, Style |

## ⚠️ RÈGLE D'OR
```
SI use_profile_ref NON LU → STOP IMMÉDIAT
Le profil contient TON IDENTITÉ COMPLÈTE (orchestration_rules + intents + capabilities)
```

---

*Fin de la catégorisation*