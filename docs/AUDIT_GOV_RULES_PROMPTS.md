
# Audit gouvernance & règles système — Prompts (CLI / AGP)

## Résumé exécutif
- Les règles globales (ARKORE02), matrices de contrôle (ARKORE06) et boucles AGP (ARKORE15) sont bien versionnées et référencent explicitement leurs dépendances, mais l’absence d’un index consolidé des règles promptées fragilise la navigation des agents hors Event Bus.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L1-L58】【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L1-L68】【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L1-L88】
- Les prérequis par rôle (ARKORE17) fournissent un socle partagé, toutefois ils reposent sur des intents (ex. `ADR_CREATE`, `TICKET_VALIDATE`) absents du référentiel d’action keys, ce qui casse la traçabilité entre prompts et exécution réelle.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L31-L152】【F:docs/intents-matrix.yaml†L12-L96】
- La matrice wakeup ↔ intents affiche 53 intents différents mais 14 wakeups restent sans intents déclarés et 28 intents n’ont pas d’action key correspondante, entraînant des intents « orphelins » côté CLI/AGP.【F:wakeup-intents.matrix.yaml†L5-L200】【F:docs/intents-matrix.yaml†L12-L76】
- L’intent router d’ARKORE12 ne mappe que 10 intents, laissant sans résolution 43 intents promptables (dont `DOCUMENT_CREATE`, `REPORT_CREATE`, `ADR_CREATE`), ce qui empêche les agents de router leurs commandes hors Event Bus.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L19-L615】【F:docs/intents-matrix.yaml†L77-L96】

## Liste des règles gouvernantes actives
### ARKORE02 — Principes & anti-dérive
- Principes transverses (clarté, modularité, validation croisée) et invariants anti-auto-validation.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L10-L55】
- Procédures d’isolation et d’urgence avec obligation de journalisation lors des bypass Owner.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L38-L47】

### ARKORE06 — Matrices de contrôle
- Matrice d’autorité (owner bypass, limitations PMO), escalades S0–S3, evidence matrix et budgets de performance (TTFT <2s).【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L10-L55】
- Invariants interdisant les invocations externes PMO et forçant les références croisées vers ARKORE09.【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L60-L65】

### ARKORE12 — Action keys & intent router
- 100 action keys structurées (features, tickets, documents, décisions, ordres) avec post-actions mémoire/évènement.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L19-L575】
- Intent router limité à 10 entrées (`CREATE_FEATURE`, `DELIVERY_SUBMIT`, etc.), laissant la majorité des intents non résolus.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L577-L615】

### ARKORE15 — Boucles réactives AGP
- Runtime non bloquant, déclencheurs `DELIVERY_RECEIVED` et action map (ACK, contrôle, mission return, owner confirm) adossés aux matrices de contrôle et templates AGP.【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L11-L73】

### ARKORE17 — Orchestration par rôle
- Prérequis communs (MEMORY_UPDATE, VALIDATE_NAMING) et héritages par rôle (AGP, PMO, lead dev, QA, etc.) imposant des états préalables (ADR_EXISTS, TESTS_PASS).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L31-L128】
- Contraintes d’orchestration (no self-validation, handoffs obligatoires) et gates `before_feature/before_release`.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L131-L144】

## Carte des Intents et leur portée
- **Inventaire global** : 53 intents distincts déclarés dans `wakeup-intents.matrix.yaml`, couvrant création de livrables, gouvernance (orders, gates) et opérations de contenu.【F:docs/intents-matrix.yaml†L12-L55】
- **Portée par wakeup** :
  - AGP : `ADR_CREATE` par défaut + 9 intents gouvernance (orders, gate, review).【F:wakeup-intents.matrix.yaml†L5-L12】
  - Profils delivery (lead dev, QA, spec writer) : scopes orientés US/tickets mais certaines entrées sans intents (`archivist`, `arka-scribe`, `agent-creator`).【F:wakeup-intents.matrix.yaml†L12-L200】
  - Profils business/content : intents de contenu (`CONTENT_CREATE`, `PUBLISH_CONTENT`) absents des action keys, rendant leur exécution impossible via router.【F:wakeup-intents.matrix.yaml†L47-L200】【F:docs/intents-matrix.yaml†L56-L76】
- **Portée vs capacités** : les experts référencent `system_rules_ref` et `orchestration_prereqs_ref` d’ARKORE17, mais la résolution échoue pour les intents non définis (`ADR_CREATE`, `STRATEGY_CREATE`, etc.), créant un écart entre capacités déclarées et actions routables.【F:ARKA_AGENT/client/acme/experts/ARKA_AGENT15-agp.yaml†L18-L30】【F:docs/intents-matrix.yaml†L56-L76】

## Problèmes détectés
1. **Intents orphelins** : 28 intents déclarés côté wakeup n’ont pas d’action key (`STRATEGY_CREATE`, `TEMPLATE_CREATE`, `SOURCING`, etc.), empêchant leur résolution dans ARKORE12.【F:docs/intents-matrix.yaml†L56-L76】
2. **Intent router incomplet** : seulement 10 intents mappés, aucun pour les opérations documentaire courantes (`DOCUMENT_CREATE`, `REPORT_CREATE`), ce qui bloque les appels CLI/AGP directs sans passer par Event Bus.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L577-L615】【F:docs/intents-matrix.yaml†L77-L96】
3. **Wakeups sans intents** : 14 agents (archivist, scribe, agent creator, orchestrator, etc.) ont des listes d’intents vides, rendant leurs prompts inopérants malgré des profils actifs.【F:wakeup-intents.matrix.yaml†L12-L40】
4. **Prérequis non résolus** : ARKORE17 impose des prérequis sur des intents inexistants (`ADR_CREATE`, `TICKET_VALIDATE`), contredisant l’invariant “all prerequisites reference existing actions”.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L103-L128】【F:docs/intents-matrix.yaml†L56-L76】
5. **Absence d’index gouvernance promptable** : aucun manifeste ne relie règles (ARKORE02/06/15/17) aux intents routables, forçant les agents à naviguer manuellement entre YAML dispersés.【F:ARKA_CORE/rules_index.yaml†L1-L35】【F:docs/intents-matrix.yaml†L1-L11】

## Suggestions
1. **Créer un manifeste centralisé `governance-rules-map.yaml`** listant pour chaque intent : action key, prérequis ARKORE17, matrices applicables, afin d’étendre `rules_index.yaml` aux commandes promptées.【F:ARKA_CORE/rules_index.yaml†L1-L36】【F:docs/intents-matrix.yaml†L1-L11】
2. **Aligner intents ↔ action keys** :
   - Ajouter les action keys manquantes dans ARKORE12 (ex. `ADR_CREATE`, `SPEC_CREATE`, `STRATEGY_CREATE`).
   - Ou restreindre les wakeups/experts à des intents existants pour respecter l’invariant ARKORE17.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L19-L575】【F:docs/intents-matrix.yaml†L56-L76】
3. **Étendre l’intent router** pour couvrir tous les intents promptables (au minimum documents, reports, gouvernance) afin d’assurer la résolution CLI/AGP sans Event Bus.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L577-L615】
4. **Compléter les wakeups vides** via héritage `include_common_intents_ref` ou refonte des profils concernés, en validant la cohérence via un test CI (`bin/os-validate.mjs`).【F:wakeup-intents.matrix.yaml†L12-L40】【F:bin/os-validate.mjs†L201-L363】
5. **Auditer les prérequis ARKORE17** : garantir que chaque requirement (`ADR_EXISTS`, `TESTS_PASS`) renvoie vers un invariant/action existant, et documenter les transitions dans un tableau de vérité (intents vs states) pour faciliter l’extension future.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L144】

# Audit — Gouvernance & Rules Prompt (hors Event Bus)

## Résumé exécutif
- Les briques de gouvernance globales (ARKORE02, ARKORE06, ARKORE15, ARKORE17, ARKORE12) définissent des principes clairs (anti-dérive, matrices d'autorité, contrôles AGP, prérequis par rôle, catalogues d'actions), mais elles sont dispersées sans index commun ni versioning croisé pour les intents déclenchés par prompt.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L1-L58】【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L1-L68】【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L1-L88】【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L1-L151】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L1-L196】
- La matrice des wakeups recense bien les profils et intents par défaut, mais plusieurs entrées laissent la liste `intents` vide alors que les fichiers wakeup/experts exposent des intents actifs, signe d'une synchronisation incomplète.【F:wakeup-intents.matrix.yaml†L5-L200】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-ARCHIVIST.yaml†L1-L22】
- L'absence d'une cartographie « intent → action_key → capacité → contexte » formelle conduit à des alias ponctuels et à des prérequis difficilement traçables, compliquant la scalabilité des règles promptées.【F:ARKA_AGENT/client/acme/ARKAA14-VOCAB-ALIASES.yaml†L1-L11】【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L31-L151】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L21-L196】

## Liste des règles gouvernantes actives
| Brique | Version | Champs structurants | Couplages / dépendances |
| --- | --- | --- | --- |
| ARKORE02-GLOBAL-RULES | 1.1.0 | Principes fondateurs, anti-dérive (no_self_validation, cross_validation), isolation, procédures d'urgence | Référence hiérarchie (ARKORE01), exige audit log pour bypass owner.【F:ARKA_CORE/bricks/ARKORE02-GLOBAL-RULES.yaml†L1-L58】 |
| ARKORE06-CONTROL-MATRICES | 1.0.0 | Matrice d'autorité, escalades S0-S3, budgets de performance, critères DoR/DoD | S'appuie sur patterns (ARKORE09), paths (ARKORE08), budgets utilisés par AGP (ARKORE15).【F:ARKA_CORE/bricks/ARKORE06-CONTROL-MATRICES.yaml†L1-L55】 |
| ARKORE15-AGP-REACTIVE-CONTROL | 1.0.0 | Runtime sans pause, événement DELIVERY_RECEIVED, zones de tuning, action_map | Consomme contrôles/évidence ARKORE06 et templates ARKORE13 ; impose MEMORY_UPDATE post-actions.【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L11-L79】 |
| ARKORE17-ORCHESTRATION-RULES | 2.0.0 | Prérequis par rôle (all/common/role), contraintes (no_self_validation), gates workflow | Référence toutes briques clés, y compris Event Bus, mais pas de mapping explicite vers action_keys ou intents CLI.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L7-L151】 |
| ARKORE12-ACTION-KEYS | 2.1.0 | Ancres de 96 actions, templates (create/read/update...), type_configs, post-hooks | Couplé à MEMORY_UPDATE obligatoire et Event Bus `emit`, sans différencier déclencheurs prompt/CLI.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L21-L138】 |
| RULES_INDEX | 0.1.0 | Index limité (paths, patterns, templates, acceptance, workflows) | Ne référence pas ARKORE15/17 ni la matrice d'intents, ce qui limite la découverte gouvernance promptée.【F:ARKA_CORE/rules_index.yaml†L1-L36】 |

## Carte des Intents et leur portée
### Synthèse consolidée
- Cartographie statique construite dans `docs/gov-rules-prompts-map.yaml`, couvrant les rôles AGP, Archiviste, Lead Dev et PMO avec leurs intents déclarés et référentiels de prérequis.【F:docs/gov-rules-prompts-map.yaml†L1-L61】
- Les profils gouvernance (AGP, PMO) héritent des prérequis `all` et `common`, ajoutant des contraintes spécifiques (ex : `DECISION_PUBLISH` requiert `GATE_PASSED` + `EVIDENCE_COMPLETE`).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L90】
- Les profils d'exécution (Lead Dev, QA, DevOps) exposent des intents orientés delivery/tests, adossés aux prérequis `lead_dev`, `qa`, etc. (tests pass, build/lint).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L92-L127】【F:wakeup-intents.matrix.yaml†L110-L179】

### Détails par rôle (extraits)
| Agent | Default intent | Intents déclarés | Sources clés | Observations |
| --- | --- | --- | --- | --- |
| AGP | ADR_CREATE | ADR_CREATE, DECISION*, ORDER*, DOCUMENT*, GATE*, REVIEW_DELIVERABLE | Wakeup matrix, expert AGP, prereqs `agp` | Rôle gouvernance complet mais dépend de mapping manuel vers action_keys ; couplage fort au contrôle AGP.【F:wakeup-intents.matrix.yaml†L5-L11】【F:ARKA_AGENT/client/acme/experts/ARKA_AGENT15-agp.yaml†L18-L30】 |
| Archiviste | ARCHIVE_CAPTURE | ARCHIVE_CAPTURE, PLAN_WORKFLOW, REVIEW_DELIVERABLE | Wakeup file, matrix (intents vide), prereqs `devops` | Désalignement matrix ↔ wakeup ; risque d'omission lors de génération des prompts.【F:wakeup-intents.matrix.yaml†L12-L18】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-ARCHIVIST.yaml†L1-L22】 |
| Lead Dev | TICKET_CREATE | DELIVERY_SUBMIT, DOCUMENT*, REPORT_CREATE, TICKET* | Wakeup matrix, expert lead dev, prereqs `lead_dev` | Scope bien défini, prérequis tests/build mais pas de lien formel vers action_keys correspondantes.【F:wakeup-intents.matrix.yaml†L110-L116】【F:ARKA_AGENT/client/acme/experts/ARKA_AGENT04-lead-dev-batisseur.yaml†L18-L33】 |
| PMO | FEATURE_CREATE | DELEGATION_CREATE, DOCUMENT_READ, REPORT_CREATE, WORKFLOW_PLAN | Wakeup matrix, expert PMO, prereqs `pmo` | Intents orientés orchestration, dépend fortement d'ADR_EXISTS sans action déclarée côté action_keys.【F:wakeup-intents.matrix.yaml†L159-L165】【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L72-L80】 |

## Problèmes détectés
- **Matrice d'intents incomplète** — plusieurs agents ont `intents: []` dans `wakeup-intents.matrix.yaml` alors que leurs fichiers wakeup/experts listent des intents actifs (ex: archiviste). Cela induit un risque de prompts démarrant sans scope explicite.【F:wakeup-intents.matrix.yaml†L12-L39】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-ARCHIVIST.yaml†L15-L21】
- **Absence de registre « intents → action_keys »** — les prérequis et alias reposent sur des chaînes librement nommées (`ORDER_CREATE`, `DECISION_PUBLISH`) sans garantie qu'une action correspondante existe dans ARKORE12 (alias manuel pour `ORDER_*`).【F:ARKA_AGENT/client/acme/ARKAA14-VOCAB-ALIASES.yaml†L6-L11】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L21-L196】
- **Couplage implicite au Event Bus** — même si l'audit exclut Event Bus, ARKORE12 impose des post-hooks `ARKORE16-EVENT-BUS:emit.*` pour chaque action, brouillant la frontière entre triggers promptés et bus système.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L28-L137】
- **Orchestration non versionnée côté intents** — ARKORE17 référence les briques (action keys, event bus, templates) mais ne précise pas quelle version minimale d'intents doit être chargée, ni comment vérifier l'exhaustivité de `available_intents` par profil.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L7-L151】
- **Index des règles incomplet** — `rules_index.yaml` n'inclut ni ARKORE15 ni ARKORE17 ; les agents promptés n'ont donc pas de point d'entrée unique pour récupérer ces règles de gouvernance réactives et d'orchestration.【F:ARKA_CORE/rules_index.yaml†L1-L36】
- **Conditions/prérequis peu traçables** — des prérequis comme `TESTS_PASS`, `GATE_PASSED`, `EVIDENCE_COMPLETE` ne sont pas définis comme actions ou states dans ARKORE12, rendant le contrôle d'application difficile à automatiser.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L127】

## Suggestions (regroupement, refactor, extensions)
1. **Créer un registre ARKORE18-INTENTS-REGISTRY** centralisant pour chaque intent : action_key cible, contexte (gouvernance/exécution/support), slices applicables, conditions d'entrée/sortie, version minimale. Cela permettrait de générer automatiquement la matrice wakeup et de valider la cohérence des prérequis.【F:wakeup-intents.matrix.yaml†L5-L200】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L21-L196】
2. **Automatiser la génération de `wakeup-intents.matrix.yaml`** depuis les fichiers wakeup/experts pour éviter les entrées vides et ajouter des métadonnées (scope, capacités, niveaux de gate). Un pipeline pourrait comparer la matrice calculée aux fichiers source et échouer en cas de divergence.【F:wakeup-intents.matrix.yaml†L12-L39】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-ARCHIVIST.yaml†L15-L21】
3. **Étendre `rules_index.yaml`** pour inclure ARKORE15, ARKORE17, le futur registre d'intents et la matrice de wakeup, offrant un point d'entrée unique aux agents promptés.【F:ARKA_CORE/rules_index.yaml†L1-L36】【F:docs/gov-rules-prompts-map.yaml†L1-L31】
4. **Normaliser les prérequis et états** en les définissant dans ARKORE12 (ou une brique dédiée aux states) afin de relier `TESTS_PASS`, `GATE_PASSED`, etc., à des actions/contrôles mesurables et loggables (permettant RBAC, audits et validations automatiques).【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L53-L141】【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L21-L138】
5. **Découpler les post-hooks Event Bus pour les intents CLI/AGP** en introduisant un champ `post_prompt` distinct ou en rendant les hooks optionnels selon le canal, afin de clarifier les responsabilités entre prompts et Event Bus.【F:ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml†L28-L137】

6. **Documenter dans chaque expert/wakeup** la version de référentiel d'intents chargée et exposer un checksum commun pour garantir que l'agent réveille la bonne configuration (permettant scalabilité multi-profils).【F:ARKA_AGENT/client/acme/experts/ARKA_AGENT15-agp.yaml†L17-L35】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-ARCHIVIST.yaml†L13-L22】
