# Assemblage ARKA_OS

Ce document décrit le flux d'assemblage des bundles ARKA_OS (core, profils, agents) ainsi que les
contrôles de cohérence et l'activation des packs d'extensions.

## Prérequis
- Node.js 18+
- Ruby 3+ (utilisé pour le parsing/sérialisation YAML)
- Bash **ou** PowerShell

## Commandes principales
| Objectif | Commande |
| --- | --- |
| Construire les bundles core/profils/agents | `npm run build` (équivaut à `bash bin/os-build.sh`) |
| Générer la matrice wakeups ↔ intents | `npm run build:matrix` |
| Valider les contrats (YAML, droits, handlers, wakeups) | `npm run validate` |
| Assembler un profil spécifique (ex. dev) | `bin/assemble.sh dev` |

Les sorties sont écrites dans `build/` :
- `core.assembly.yaml`
- `profiles.bundle.yaml`
- `assembly.yaml` (agents + wakeups + experts)

## Extensions (`ARKA_EXT/`)
- Les packs résident à la racine du dépôt (`ARKA_EXT/ARKAEXT**.yaml`).
- Chaque fichier expose `id`, `version`, `title`, `isolation: true` et un bloc `override:`.
- Exemple d'activation : ajouter `ARKA_EXT/ARKAEXT01-SUBS-CI.yaml` dans `profiles/dev.override.yaml`.
- Les handlers locaux doivent vivre dans `scripts/handlers/` et être exécutables.

## Validation automatisée
`bin/os-validate.mjs` réalise les contrôles suivants :
1. Parsing YAML sans clé dupliquée.
2. Présence du set d'actions `create_structure` et cohérence des `action_sets` / `path_sets` référencés.
3. Cohérence des profils (`right_ref`, `rights`).
4. Cohérence wakeups ↔ profils ↔ experts (agent_id unique, fichiers existants).
5. Existence et exécutabilité des handlers référencés par `ARKORE16-EVENT-BUS` et `ARKAA12-EVENTS-PACK`.
6. Unicité des entrées `enable` dans `master-agent.yaml`.
7. Vérification que `wakeup-intents.matrix.yaml` est à jour.

La commande renvoie un code de sortie non nul en cas de violation et détaille les erreurs.

## Matrice wakeups ↔ intents
`bin/generate-wakeup-matrix.mjs` agrège pour chaque wakeup :
- `agent_id`
- fichier wakeup
- profil associé (`use_profile_ref`)
- expert référencé et sa liste `available_intents`
- `default_intent`

Le résultat est sérialisé dans `wakeup-intents.matrix.yaml`, utilisé ensuite par le validateur.

## Journaux et mémoires
Les handlers événementiels déposent leurs sorties dans `.logs/` (ex. `delivery_received__adr_snapshot.js`)
afin de conserver une trace hors runtime. Ces répertoires (`.logs/`, `.mem/`) sont versionnés via `.gitkeep`.
