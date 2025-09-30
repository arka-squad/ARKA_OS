# Audit structurel ARKA_OS — checklist-audit-arka-v1

## Résumé exécutif
- La stratification en trois couches (core, profils, agent) reste lisible et pilotée par des manifestes uniques qui imposent l'ordre d'assemblage et les invariants de gouvernance, ce qui facilite le contrôle de conformité.【F:ARKA_CORE/master-assembly.yaml†L1-L68】【F:ARKA_PROFIL/master-profiles.yaml†L1-L17】【F:ARKA_AGENT/master-agent.yaml†L1-L41】
- Les boucles AGP, la mémoire et l'Event Bus sont bien couplés : chaque action clef publie vers la mémoire et les topics, garantissant la traçabilité des livrables et l'orchestration des réactions.【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L1-L74】【F:ARKA_CORE/bricks/ARKORE14-MEMORY-OPS.yaml†L1-L80】【F:ARKA_CORE/bricks/ARKORE16-EVENT-BUS.yaml†L1-L85】
- Les packs d'extensions et overrides permettent une isolation effective des intégrations client, mais plusieurs incohérences de catalogues (profils, wakeups, scripts) cassent la promesse de modularité en pratique.【F:ARKA_CORE/profiles/dev.override.yaml†L1-L6】【F:ARKA_CORE/ARKA_EXT/ARKAEXT01-SUBS-CI.yaml†L1-L17】【F:ARKA_PROFIL/bricks/ARKPR05-RIGHTS.yaml†L13-L117】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-PMO.yaml†L1-L31】

## Points forts
- **Manifeste Core complet** : `master-assembly.yaml` charge toutes les briques constitutionnelles avec variantes (`dev-light`, `strict-security`) et rappelle les contraintes de séquencement AGP/PMO, renforçant la gouvernance centralisée.【F:ARKA_CORE/master-assembly.yaml†L1-L68】
- **Boucle AGP instrumentée** : la zone AGP définit des actions atomiques (ACK, contrôle, mission retour, escalade) qui exécutent systématiquement `MEMORY_UPDATE`, assurant l'enregistrement post-action sans configuration additionnelle.【F:ARKA_CORE/bricks/ARKORE15-AGP-REACTIVE-CONTROL.yaml†L10-L74】
- **Mémoire structurée** : la brique `MEMORY_OPS` impose des schémas jsonl, l'idempotence et des hooks standardisés pour chaque action, améliorant la rejouabilité et l'analyse postérieure.【F:ARKA_CORE/bricks/ARKORE14-MEMORY-OPS.yaml†L10-L80】
- **Event Bus extensible** : `ARKORE16` expose une taxonomie claire, des schémas de payload et un mode multi-dispatch, avec instrumentation automatique des actions clés — idéal pour brancher CI ou alerting.【F:ARKA_CORE/bricks/ARKORE16-EVENT-BUS.yaml†L10-L85】
- **Isolation des extensions** : les overrides activent `ARKA_EXT` depuis un profil sans modifier le core, ce qui protège la baseline tout en autorisant des intégrations locales (GitHub, Slack, embeddings).【F:ARKA_CORE/profiles/dev.override.yaml†L1-L6】【F:ARKA_CORE/ARKA_EXT/ARKAEXT01-SUBS-CI.yaml†L1-L17】【F:ARKA_CORE/scripts/handlers/us_created__issue_links.js†L1-L51】【F:ARKA_CORE/scripts/handlers/memory_updated__sync_embeddings.sh†L1-L9】
- **Fiches experts riches** : les YAML d'experts documentent domaines, intents et workflows standardisés, facilitant le mapping entre besoins métiers et actions disponibles.【F:ARKA_AGENT/client/acme/experts/ARKA_AGENT04-lead-dev-batisseur.yaml†L1-L62】【F:ARKA_AGENT/AGENT00-INDEX.yaml†L20-L42】
- **Contexte client consolidé** : `ARKAA21-PROJECT-CONTEXT` regroupe les règles de gouvernance, DOR/DOD et tonalité, limitant la duplication de paramètres dans les wakeups.【F:ARKA_AGENT/client/acme/ARKAA21-PROJECT-CONTEXT.yaml†L1-L42】

## Points faibles ou ambigus
- **Action set manquant** : plusieurs droits référencent `create_structure` mais aucun set n'est défini dans `ARKPR03`, invalidant la résolution d'autorisations et les invariants annoncés.【F:ARKA_PROFIL/bricks/ARKPR03-ACTION-SETS.yaml†L1-L28】【F:ARKA_PROFIL/bricks/ARKPR05-RIGHTS.yaml†L13-L117】
- **Droits AGP dupliqués/incohérents** : `agp_rights` est déclaré deux fois avec des périmètres différents et le catalogue ajoute un noeud `agp` hybride (`right_ref` + `action_sets`), créant des collisions de merge et une gouvernance floue.【F:ARKA_PROFIL/bricks/ARKPR05-RIGHTS.yaml†L6-L46】【F:ARKA_PROFIL/bricks/ARKPR08-PROFILES-CATALOG.yaml†L5-L27】
- **Wakeups désalignés sur les profils** : `use_profile_ref` cible `profiles.lead_dev` ou `profiles.pmo` alors que le catalogue n'expose que `lead-dev-batisseur` et `arka-product-manager-officer`, rendant la résolution impossible.【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-LEAD_DEV_BATISSEUR.yaml†L1-L23】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-PMO.yaml†L1-L31】【F:ARKA_PROFIL/bricks/ARKPR08-PROFILES-CATALOG.yaml†L5-L27】
- **Capacités non alignées** : `ARKAA19` référence `use_profile: pmo-orchestrator` et un agent `pmo` absent du catalogue, ce qui brise la chaîne `wake-up → capabilities → profil` et viole l'invariant "Chaque use_profile existe dans ARKPR08".【F:ARKA_AGENT/client/acme/ARKAA19-AGENT-CAPABILITIES.yaml†L33-L99】【F:ARKA_PROFIL/bricks/ARKPR08-PROFILES-CATALOG.yaml†L5-L27】
- **Assemblage agent incomplet** : le script `os-build.sh` n'agrège que `client/acme/*.yaml`, excluant systématiquement les sous-dossiers `experts/` et `wakeup/`; l'assembly généré est donc amputé des définitions essentielles.【F:bin/os-build.sh†L1-L17】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-LEAD_DEV_BATISSEUR.yaml†L1-L23】【F:ARKA_AGENT/client/acme/experts/ARKA_AGENT04-lead-dev-batisseur.yaml†L1-L62】
- **Références de chemins erronées** : `ARKORE17` pointe vers `ARKORE08-PATHS-GOVERNANCE:exports.features/...` alors que la brique expose les racines sous `output`/`paths`, ce qui casse l'accès rapide aux nomenclatures pour tous les experts.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L20-L28】【F:ARKA_CORE/bricks/ARKORE08-PATHS-GOVERNANCE.yaml†L13-L55】
- **Event Bus par défaut cassé** : la subscription `on_memory_update.sh` s'appuie sur `scripts/` mais le script vit dans `scripts/exemples/`, entraînant un échec sans override explicite. L'extension CI corrige, mais le core n'est pas exécutable seul.【F:ARKA_CORE/bricks/ARKORE16-EVENT-BUS.yaml†L48-L76】【F:ARKA_CORE/scripts/exemples/on_memory_update.sh†L1-L7】
- **Wakeups et capabilities en doublon** : `master-agent.yaml` active deux fois `ARKAA08-WAKEUP-AGP`, signalant un manque de revue du bundle par défaut.【F:ARKA_AGENT/master-agent.yaml†L12-L41】

## Recommandations concrètes
1. **Compléter les jeux d'actions et droits**
   - Ajouter `create_structure` (et tout set manquant) dans `ARKPR03`, puis consolider `agp_rights` en une seule définition alignée avec le catalogue.【F:ARKA_PROFIL/bricks/ARKPR03-ACTION-SETS.yaml†L1-L28】【F:ARKA_PROFIL/bricks/ARKPR05-RIGHTS.yaml†L6-L117】
   - Normaliser l'entrée `agp` du catalogue avec la même forme `{ rights, limits, tags }` pour éviter les merges hybrides.【F:ARKA_PROFIL/bricks/ARKPR08-PROFILES-CATALOG.yaml†L5-L27】

2. **Réaligner wakeups, profils et capacités**
   - Corriger `use_profile_ref` (`lead-dev-batisseur`, `arka-product-manager-officer`, etc.) et ajouter les clés manquantes (`pmo`) côté `ARKAA19` pour respecter l'invariant "Chaque use_profile existe".【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-LEAD_DEV_BATISSEUR.yaml†L1-L23】【F:ARKA_AGENT/client/acme/wakeup/ARKAA08-WAKEUP-PMO.yaml†L1-L31】【F:ARKA_AGENT/client/acme/ARKAA19-AGENT-CAPABILITIES.yaml†L33-L56】
   - Supprimer le doublon `ARKAA08-WAKEUP-AGP` dans `master-agent.yaml` et vérifier que chaque wakeup dispose d'un expert et d'un profil cohérents.【F:ARKA_AGENT/master-agent.yaml†L12-L41】

3. **Fiabiliser l'assemblage et les références**
   - Mettre à jour `bin/os-build.sh` pour inclure `client/acme/wakeup/*.yaml` et `client/acme/experts/*.yaml` dans l'agrégation YQ, ou générer les bundles wakeup/experts séparément avant inclusion.【F:bin/os-build.sh†L13-L16】
   - Corriger les pointeurs `ARKORE17` vers les clés existantes (`ARKORE08-PATHS-GOVERNANCE:paths.features_root`, etc.) afin que les agents résolvent effectivement les chemins et patterns.【F:ARKA_CORE/bricks/ARKORE17-ORCHESTRATION-RULES.yaml†L20-L28】【F:ARKA_CORE/bricks/ARKORE08-PATHS-GOVERNANCE.yaml†L30-L55】

4. **Assurer l'exécutabilité par défaut du bus d'événements**
   - Déplacer `on_memory_update.sh` dans `scripts/` ou ajuster `ARKORE16.dispatch.local.base_dir` pour pointer vers `scripts/exemples/`, afin que la configuration core reste fonctionnelle sans override.【F:ARKA_CORE/bricks/ARKORE16-EVENT-BUS.yaml†L48-L76】【F:ARKA_CORE/scripts/exemples/on_memory_update.sh†L1-L7】
   - Documenter dans `README-EXT` la liste des scripts requis et fournir des placeholders dans `scripts/handlers/` pour les abonnements déclarés par défaut.【F:ARKA_CORE/ARKA_EXT/README-EXT.md†L1-L5】【F:ARKA_CORE/scripts/handlers/memory_updated__sync_embeddings.sh†L1-L9】

5. **Renforcer la cohérence des catalogues**
   - Vérifier que chaque entrée `expert_only` du registre dispose d'un wakeup ou d'un statut explicite dans la roadmap pour éviter les zones mortes dans l'orchestration.【F:ARKA_AGENT/AGENT00-INDEX.yaml†L32-L42】
   - Étendre `ARKAA21-PROJECT-CONTEXT` avec les mappings manquants (p.ex. correspondance profil ↔ mission) pour réduire les hard-codes dans les wakeups futurs.【F:ARKA_AGENT/client/acme/ARKAA21-PROJECT-CONTEXT.yaml†L6-L42】

