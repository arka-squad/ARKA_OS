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
