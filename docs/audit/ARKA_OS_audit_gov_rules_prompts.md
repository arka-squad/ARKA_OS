# Audit gouvernance & prompts (ARKA_OS)

## Résumé exécutif
- Les règles cœur de gouvernance sont réparties dans quatre briques (globales, matrices de contrôle, boucle AGP, orchestration) mais restent fortement couplées entre elles via des références croisées, ce qui complique leur versionnage isolé et la lecture sélective par profil.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L1-L56】【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L1-L68】【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L1-L88】【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L1-L152】
- 53 intents métiers sont distribués dans les wake-ups/experts, mais seuls trois d’entre eux disposent d’un routage prompt explicite (`DELIVERY_SUBMIT`, `ORDER_CREATE`, `REVIEW_DELIVERABLE`), générant un risque élevé d’intents orphelins pour les démarrages CLI/AGP.【144f2b†L1-L14】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L568-L588】【F:docs/audit/intents-governance-map.yaml†L1-L158】
- Des intents critiques (`ADR_CREATE`, `TICKET_VALIDATE`, `DOCUMENT_UPDATE`, etc.) sont déclarés dans les profils et prérequis, mais absents soit du référentiel d’action keys, soit du routeur prompt, entraînant des écarts entre règles de gouvernance et capacités exécutables.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L133】【F:wakeup-intents.matrix.yaml†L5-L200】【F:docs/audit/intents-governance-map.yaml†L4-L160】
- Les fichiers présentent des artefacts de format (retours chariot dans `change_policy`) et des dépendances vers l’Event Bus jusque dans les actions promptées, rendant la lecture moins lisible malgré la demande « hors Event Bus ».【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L503-L517】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L599-L616】

## Liste des règles gouvernantes actives
| Brique | Version | Portée | Exports clés | Couplages majeurs |
| --- | --- | --- | --- | --- |
| ARKORE02-GLOBAL-RULES | 1.1.0 | Principes, anti-dérive, isolation, procédures d’urgence | `principles`, `anti_drift`, `isolation`, `emergency` | Référence directe à ARKORE06 pour éviter les doublons, dépendance hiérarchique ARKORE01.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L1-L56】 |
| ARKORE06-CONTROL-MATRICES | 1.0.0 | Autorité, escalade, evidences, budgets, gates | `authority_matrix`, `escalation_matrix`, `performance_matrix`, `gate.criteria` | Contraintes fortes vers ARKORE09 (patterns), ARKORE01, renvois utilisés par AGP et action keys.【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L1-L68】 |
| ARKORE15-AGP-REACTIVE-CONTROL | 1.0.0 | Boucle runtime de contrôle AGP (ACK, évaluation, mission return) | `runtime`, `events`, `zones`, `action_map` | Dépendances ARKORE05/06/13/14 et post-hooks mémoire, action_map utilisée par ACTION_KEYS.【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L1-L88】 |
| ARKORE17-ORCHESTRATION-RULES | 2.0.0 | Prérequis par rôle, contraintes d’orchestration, gates | `intents.prereqs`, `orchestration_constraints`, `workflow_gates` | Centralise références ARKORE12/14/16/08/09/04/05 ; impose interdictions communes.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L7-L152】 |
| ARKORE12-ACTION-KEYS | 2.1.0 | 96 actions, templates et intent router | `action_templates`, `intent_router`, `prompt_macros` | Actions couplées à EVENT BUS (`emit.*`), invariants MEMOIRE, router partiel utilisé dans master-assembly runner.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L400-L517】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L568-L616】【F:ARKA_CORE/master-assembly.yaml†L1-L61】 |

## Carte des intents et leur portée
### Vue wake-up / profils
| Agent | Profil | Intent par défaut | Intents déclarés |
| --- | --- | --- | --- |
| agp | agp | ADR_CREATE | ADR_CREATE, DECISION_ARCHIVE, DECISION_PUBLISH, DOCUMENT_CREATE, DOCUMENT_READ, GATE_BROADCAST, GATE_NOTIFY, ORDER_CREATE, ORDER_ESCALATE, REVIEW_DELIVERABLE |
| arka-agent00-archivist | archivist | ARCHIVE_CAPTURE | — |
| arka-agent01-arka-archivist-orchestrator | arka-archivist-orchestrator | ARCHIVE_CAPTURE | — |
| arka-agent02-arka-scribe | arka-scribe | ARCHIVE_CAPTURE | — |
| arka-agent03-agent-creator-client | agent-creator-client | FEATURE_CREATE | — |
| arka-agent14-security-compliance-architect | security-compliance-architect | VALIDATE_NAMING | ANALYSIS_CREATE, DOCUMENT_CREATE, ORDER_ESCALATE, REPORT_CREATE, REVIEW_DELIVERABLE |
| brand-strategy-architect | brand-strategy-architect | STRATEGY_CREATE | ANALYSIS_CREATE, DOCUMENT_CREATE, GUIDELINES_CREATE, REVIEW_DELIVERABLE, STRATEGY_CREATE |
| compensation-benefits-analyst | compensation-benefits-analyst | ANALYSIS_CREATE | ANALYSIS_CREATE, BENCHMARK_CREATE, DOCUMENT_CREATE, REPORT_CREATE, SIMULATION_RUN |
| content-strategy-manager | content-strategy-manager | CONTENT_CREATE | ANALYSIS_CREATE, CONTENT_CREATE, DOCUMENT_CREATE, EDITORIAL_PLAN_CREATE, PUBLISH_CONTENT |
| devops-guardian | devops-guardian | VALIDATE_NAMING | ARCHIVE_CAPTURE, DOCUMENT_CREATE, REPORT_CREATE, TICKET_CREATE, TICKET_UPDATE, VALIDATE_NAMING, WORKFLOW_PLAN |
| employee-experience-designer | employee-experience-designer | ANALYSIS_CREATE | ANALYSIS_CREATE, DOCUMENT_CREATE, PROCESS_DESIGN, REPORT_CREATE, SURVEY_CREATE |
| fsx-extreme-fullstack | fsx-extreme-fullstack | ORDER_ESCALATE | ARCHIVE_CAPTURE, DELIVERY_SUBMIT, ORDER_ESCALATE, REPORT_CREATE, TICKET_CLOSE, TICKET_CREATE |
| gemini-owner-sourcing | gemini-owner-sourcing | SOURCING | ANALYSIS_CREATE, REPORT_CREATE, SOURCING |
| growth-hacker-specialist | growth-hacker-specialist | EXPERIMENT_CREATE | ANALYSIS_CREATE, AUTOMATION_CREATE, EXPERIMENT_CREATE, REPORT_CREATE, TEST_RUN |
| hr-transformation-specialist | hr-transformation-specialist | ANALYSIS_CREATE | ANALYSIS_CREATE, DOCUMENT_CREATE, PROCESS_DESIGN, REPORT_CREATE, ROADMAP_CREATE |
| lead-dev-batisseur | lead-dev-batisseur | TICKET_CREATE | DELIVERY_SUBMIT, DOCUMENT_CREATE, DOCUMENT_UPDATE, REPORT_CREATE, TICKET_CLOSE, TICKET_CREATE, TICKET_UPDATE |
| learning-development-strategist | learning-development-strategist | ANALYSIS_CREATE | ANALYSIS_CREATE, ASSESSMENT_CREATE, CURRICULUM_DESIGN, PROGRAM_CREATE, REPORT_CREATE |
| market-research-specialist | market-research-specialist | ANALYSIS_CREATE | ANALYSIS_CREATE, ANALYSIS_READ, DOCUMENT_CREATE, DOCUMENT_READ, REPORT_CREATE |
| marketing-analytics-expert | marketing-analytics-expert | ANALYSIS_CREATE | ANALYSIS_CREATE, DASHBOARD_CREATE, INSIGHT_GENERATE, MODEL_CREATE, REPORT_CREATE |
| mission-qualifier | mission-qualifier | ANALYSIS_CREATE | ANALYSIS_CREATE, DECISION_PUBLISH, DOCUMENT_CREATE, DOCUMENT_UPDATE, REPORT_CREATE |
| outreach-strategist | outreach-strategist | DOCUMENT_CREATE | ANALYSIS_CREATE, DOCUMENT_CREATE, DOCUMENT_UPDATE, MESSAGE_SEND, REPORT_CREATE |
| pipeline-tracker | pipeline-tracker | REPORT_CREATE | ANALYSIS_CREATE, DASHBOARD_UPDATE, NOTIFICATION_SEND, REPORT_CREATE, REPORT_UPDATE |
| pmo | arka-product-manager-officer | FEATURE_CREATE | DELEGATION_CREATE, DOCUMENT_READ, REPORT_CREATE, WORKFLOW_PLAN |
| positioning-expert | positioning-expert | DOCUMENT_CREATE | ANALYSIS_CREATE, DOCUMENT_CREATE, DOCUMENT_UPDATE, REVIEW_DELIVERABLE, TEMPLATE_CREATE |
| qa-testeur | qa-testeur | TICKET_VALIDATE | DOCUMENT_CREATE, DOCUMENT_UPDATE, REPORT_CREATE, REVIEW_DELIVERABLE, TICKET_VALIDATE |
| spec-writer | spec-writer | SPEC_CREATE | DOCUMENT_CREATE, EPIC_CREATE, FEATURE_CREATE, SPEC_CREATE, US_CREATE |
| technical-architect | technical-architect | ADR_CREATE | ADR_CREATE, ANALYSIS_CREATE, ANALYSIS_READ, DOCUMENT_CREATE, DOCUMENT_UPDATE, PLAN_CREATE, REVIEW_DELIVERABLE |
| ux-ui-design-guardian | ux-ui-design-guardian | DOCUMENT_CREATE | ANALYSIS_CREATE, DOCUMENT_CREATE, DOCUMENT_UPDATE, REPORT_CREATE, REVIEW_DELIVERABLE |

*Total : 28 cartes experts analysées pour 53 intents uniques.*【e5e0a9†L1-L31】【144f2b†L1-L14】【F:wakeup-intents.matrix.yaml†L5-L200】

### Vue règles & capacités
- Prérequis globaux (MEMORY_UPDATE, VALIDATE_NAMING, CHECK_PATHS, FORBIDDEN) s’appliquent à tous les rôles et imposent des contrôles avant création/déplacement.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L31-L133】
- Nombre d’intents requis par rôle (AGP, PMO, Lead Dev, Technical Architect, etc.) font référence à des actions qui ne sont pas toutes routables (ex. `ADR_CREATE`, `TICKET_VALIDATE`).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L133】【F:docs/audit/intents-governance-map.yaml†L4-L160】
- Le routeur d’intents ne couvre que dix alias de prompts, majoritairement orientés structure (create/close).【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L568-L588】

## Problèmes détectés
1. **Intent router incomplet :** seulement trois intents métiers (sur 53) ont un alias prompt, ce qui rend la majorité des wake-ups non exécutables via CLI/AGP sans intervention manuelle.【144f2b†L1-L14】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L568-L588】【F:docs/audit/intents-governance-map.yaml†L4-L160】
2. **Actions manquantes pour intents critiques :** `ADR_CREATE`, `TICKET_VALIDATE`, `DOCUMENT_UPDATE`, `DOCUMENT_READ`, `PLAN_CREATE`, etc. sont requis dans ARKORE17 et déclarés dans les wake-ups mais absents soit d’`action_keys`, soit du routage prompt (ex. `ADR_CREATE` non défini dans ARKORE12).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L133】【F:wakeup-intents.matrix.yaml†L5-L200】【F:docs/audit/intents-governance-map.yaml†L4-L160】
3. **Couplage persistant à l’Event Bus :** même pour une exécution « hors Event Bus », plusieurs actions promptables publient des événements (`ARKORE16-EVENT-BUS:emit.*`) et exigent MEMOIRE_UPDATE, ce qui complexifie la réutilisation dans des contextes isolés.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L503-L517】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L599-L616】
4. **Incohérence des intent lists wake-up vs experts :** certains wake-ups n’ont aucune liste d’intents (archivist, scribe) malgré des capacités attendues, ce qui limite la scalabilité et la lisibilité des profils.【F:wakeup-intents.matrix.yaml†L12-L39】
5. **Lisibilité perfectible :** les sections `change_policy` contiennent des retours chariot (`semver` collé au prompt), rendant la lecture et la validation automatique moins fiables, notamment dans ARKORE02 et ARKORE06.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L48-L58】【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L56-L68】
6. **Absence de cartographie centralisée versionnée :** il n’existe pas de fichier synthétique listant l’état de couverture Intent→Action→Prompt (d’où la création de `docs/audit/intents-governance-map.yaml`).【F:docs/audit/intents-governance-map.yaml†L1-L160】

## Suggestions (regroupement, refactor, extensions)
1. **Étendre et versionner l’intent router :** compléter `ARKORE12-ACTION-KEYS:intent_router` avec l’ensemble des 53 intents ou fournir des alias de fallback (`ANALYSIS_*`, `DOCUMENT_*`, etc.), en s’appuyant sur la matrice produite (`docs/audit/intents-governance-map.yaml`).【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L568-L588】【F:docs/audit/intents-governance-map.yaml†L4-L160】
2. **Aligner actions & prérequis :** créer/compléter les action keys manquantes (`ADR_CREATE`, `TICKET_VALIDATE`, `DOCUMENT_READ/UPDATE`, `PLAN_CREATE`, etc.) ou réviser les wake-ups/prérequis pour ne référencer que des actions existantes ; intégrer ces vérifications dans `ARKORE17` (`contracts.invariants`).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L149】【F:wakeup-intents.matrix.yaml†L5-L200】
3. **Isoler la couche prompt des événements :** proposer des variantes d’actions sans dépendance Event Bus pour les usages offline (ex. suffixe `_LOCAL`), en s’appuyant sur les invariants MEMOIRE_UPDATE déjà présents pour maintenir l’état.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L503-L517】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L599-L616】
4. **Normaliser les wake-ups vides :** imposer dans `ARKPR20-WAKEUP-POLICIES` une règle `min_intents > 0` et enrichir les profils archiviste/scribe/agent creator avec un set d’intents cohérent, pour gagner en exhaustivité et scalabilité.【F:ARKA_PROFIL/bricks/ARKPR20-WAKEUP-POLICIES.yaml†L1-L16】【F:wakeup-intents.matrix.yaml†L12-L39】
5. **Nettoyer les formats YAML & pipelines de validation :** corriger les retours chariot dans `change_policy` (ARKORE02/06/15) et ajouter une validation automatique dans `bin/os-validate.mjs` pour prévenir ces anomalies de lisibilité.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L48-L58】【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L56-L68】
6. **Institutionnaliser la matrice Intent→Action :** intégrer `docs/audit/intents-governance-map.yaml` dans `rules_index.yaml` ou créer une brique `ARKORE18-INTENT-MAP` versionnée, afin de fournir un point d’entrée unique et vérifiable pour les futurs profils/CLI.【F:docs/audit/intents-governance-map.yaml†L1-L160】【F:ARKA_CORE/rules_index.yaml†L1-L36】

