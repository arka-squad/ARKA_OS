# ARKA_OS — Manuel Utilisateur (README de référence)

> **But de ce document**
>
> Ce README sert de **manuel utilisateur** et de **spécification fonctionnelle** pour l’app ARKA (desktop ou CLI) bâtie sur le monorepo **ARKA_OS**. Il décrit clairement : l’architecture (CORE/PROFIL/AGENT), les commandes, les contrats I/O, la mémoire, l’Event Bus, les profils, l’intégration client, la sécurité, la maintenance et la portabilité.
>
> **TL;DR** : Un LLM n’a pas à lire la constitution. Il appelle une **clé d’action** (ARKORE12) → le moteur **résout des références** (paths, nommage, templates, critères) → exécute en respectant **les droits** (PROFIL) → et **sauvegarde la mémoire** (ARKORE14). L’AGP contrôle **sans pause** (ARKORE15). Les scripts externes se branchent via l’**Event Bus** (ARKORE16).

---

## 1) Architecture

### 1.1 Couches logiques

```
ARKA_OS/
├─ ARKA_CORE/    # Règles de gouvernance (constitution modulaire)
├─ ARKA_PROFIL/  # Profils & droits (action_sets, path_sets, rights, limits, policy)
└─ ARKA_AGENT/   # Contexte client (sectoriel), templates & intégrations (events)
```

**Séparation forte** :

* **CORE** = source de vérité des règles (01–09, 12–16). Lecture seule.
* **PROFIL** = qui a le droit de faire quoi et où (sets/bundles). Lecture seule côté app.
* **AGENT** = choix d’un profil + contexte client + templates + intégrations. Lecture/override **autorisé uniquement** pour 13 (templates) et 16 (events). Jamais de duplication de règles.

### 1.2 Flux d’exécution

```
Entrée (prompt/commande) → Autorisation (PROFIL) → Résolution (CORE) → Application (AGENT) → Mémoire (CORE/14)
```

* **Autorisation** : vérifie `action_key` ∈ action_sets du profil, paths autorisés, limites/ratelimits.
* **Résolution** : pas de règles copiées ; uniquement des **références** vers 08 (chemins), 09 (regex/nommage), 13 (templates), 05 (acceptance), etc.
* **Application** : templates `file://` client + publications Event Bus.
* **Mémoire** : **toujours** `MEMORY_UPDATE` (succès/échec) avec schéma compact.

---

## 2) Prérequis & Portabilité

* **Node 18+**, **Git**. En dev : **yq** (mikefarah) pour assembler, pas nécessaire au runtime si vous embarquez les bundles pré‑générés.
* OS : Windows, macOS, Linux. UTF‑8 recommandé; CRLF toléré.
* Réseau **optionnel** : webhooks désactivables → fonctionnement **offline** possible.

**Répertoires de données** (mémoire) recommandés :

* Windows : `%APPDATA%/ArkaLabs/.mem/`
* macOS : `~/Library/Application Support/ArkaLabs/.mem/`
* Linux  : `~/.local/share/ArkaLabs/.mem/`

Variables utiles :

* `ARKA_TPL_DIR` → répertoire templates embarqués (AGENT).
* `MEM_DIR` → racine mémoire (redirige ARKORE14.storage.roots_ref si besoin).

---

## 3) Arborescence du monorepo

```
ARKA_OS/
├─ ARKA_CORE/
│  ├─ bricks/ (ARKORE**.yaml)        ─► 01–09, 12–16
│  ├─ ARKORE00-INDEX.yaml
│  ├─ master-assembly.yaml
│  └─ build/core.assembly.yaml       (produit)
├─ ARKA_PROFIL/
│  ├─ bricks/ (ARKPR**.yaml)         ─► 03–08 (action_sets, rights, limits, policy, catalog)
│  ├─ PROFILES00-INDEX.yaml
│  ├─ master-profiles.yaml
│  └─ build/profiles.bundle.yaml     (produit)
├─ ARKA_AGENT/
│  ├─ client/<client>/*.yaml         ─► 10–15 (context, templates, events, plan directeur)
│  ├─ AGENT00-INDEX.yaml
│  ├─ master-agent.yaml
│  └─ build/assembly.yaml            (produit final)
└─ bin/
   ├─ os-build.ps1 / os-build.sh     ─► construit les 3 bundles
   └─ os-run.ps1   / os-run.sh       ─► exécute le runner avec les 3 bundles
```

---

## 4) Build & Run (points d’entrée racine)

### 4.1 Build

* **PowerShell** : `pwsh bin/os-build.ps1`
* **Bash**       : `bash bin/os-build.sh`

Produit :

* `ARKA_CORE/build/core.assembly.yaml`
* `ARKA_PROFIL/build/profiles.bundle.yaml`
* `ARKA_AGENT/build/assembly.yaml`

### 4.2 Run

* **PowerShell** : `pwsh bin/os-run.ps1 -Agent lead-dev-batisseur -Action US_CREATE -InputJson '{...}'`
* **Bash**       : `bash bin/os-run.sh lead-dev-batisseur US_CREATE '{...}'`

> Le runner consomme **uniquement** ces 3 bundles. Aucun accès aux sources `.md`/`.yaml` n’est requis en prod.

---

## 5) Action Keys — API LLM (ARKORE12)

Les LLMs n’explorent pas les règles : ils invoquent une **clé d’action**. Chaque clé retourne des **références** vers :

* **Chemins** (ARKORE08), **Nommage** (ARKORE09), **Templates** (ARKORE13), **Critères** (ARKORE05), **Contrôles** (ARKORE06).

**Clés standards** (exemples) :

* `FEATURE_CREATE`, `EPIC_CREATE`, `US_CREATE`
* `TICKET_CREATE`, `TICKET_CLOSE`
* `DELIVERY_SUBMIT`, `MISSION_INGEST`
* `VALIDATE_NAMING`, `ARCHIVE_CAPTURE`

**Alias pris en charge** : `ORDER_CREATE`→`TICKET_CREATE`, `ORDER_CLOSE`→`TICKET_CLOSE`.

**Exemple I/O — `US_CREATE`**

```yaml
use: ARKORE12-ACTION-KEYS:action_keys.US_CREATE
input:
  featureId: "FEAT-12"
  epicId: "EPIC-FEAT-12-03"
  usId: "US-EPIC-12-03-07"
  title: "export CSV"
  kebab_title: "export-csv"
```

**Macro minimale** :

1. valider nommage (regex 09)
2. construire routes (08)
3. créer dossiers/fichiers
4. appliquer template (13)
5. vérifier acceptance (05)
6. `MEMORY_UPDATE` (14)

---

## 6) Profils & Autorisation (ARKA_PROFIL)

### 6.1 Concepts

* `action_sets` : groupes d’actions (ex: `ticket_ops` = `[TICKET_CREATE,TICKET_CLOSE]`).
* `path_sets` / `deny_sets` : groupes de globs (ex: `us_tickets_only`, `secrets`).
* `rights` : bundle = `action_sets + allow_paths + deny_paths + net_access`.
* `limits` : ratelimits/quotas + réfs vers budgets/escalades (ARKORE06).
* `policy` : règles d’évaluation (priorité deny>allow, net_access minimal, etc.).
* `profiles` : catalogue **nom → {rights, limits}** prêt à être consommé par l’AGENT.

### 6.2 Évaluation (ordre strict)

1. **Action** : `action_key ∈ agent.rights.action_sets?` sinon **refus**.
2. **Chemins** : sorties ⊆ `allow_paths` et ∉ `deny_paths` sinon **refus**.
3. **Limites** : appliquer `ratelimit`; consulter budgets/escalades.
4. **Post** : **toujours** `MEMORY_UPDATE`.

---

## 7) Contexte Client & Intégrations (ARKA_AGENT)

### 7.1 Briques principales

* `ARKAA10-CONTEXT` : secteur (`fintech/health/retail`), locale (`fr-FR`, `Europe/Paris`), glossary, classes de données (PII…), tolérance au risque, alias de vocabulaire.
* `ARKAA11-TEMPLATES-PROVIDER` : mappage **file://** vers les templates réels.
* `ARKAA12-EVENTS-PACK` : subscriptions & dispatch (local/webhook/stdout). **Ne bloque pas** l’action si un webhook échoue (retry/backoff conseillé).
* `ARKAA13-COMPLIANCE-POLICY` : overrides non-normatifs (ex: owner confirmation si `data_class==PII`, rétention mémoire).
* `ARKAA14-VOCAB-ALIASES` : alias domaine → actions/inputs (complète ARKORE12).
* `ARKAA15-PLAN-DIRECTEUR` : **vision, objectifs/actions, roadmap** (liens refs + shortcuts).

### 7.2 Exemple minimal (client `acme`)

```yaml
# AGENT00-INDEX.yaml (extrait)
ARKAA10-CONTEXT:            { file: client/acme/ARKAA10-CONTEXT.yaml,            version: 1.0.0, exports: [sector, locale, glossary, risk_tolerance, data_classes] }
ARKAA11-TEMPLATES-PROVIDER: { file: client/acme/ARKAA11-TEMPLATES-PROVIDER.yaml, version: 1.0.0 }
ARKAA12-EVENTS-PACK:        { file: client/acme/ARKAA12-EVENTS-PACK.yaml,        version: 1.0.0 }
ARKAA15-PLAN-DIRECTEUR:     { file: client/acme/ARKAA15-PLAN-DIRECTEUR.yaml,     version: 1.0.0 }
```

---

## 8) Mémoire (ARKORE14)

### 8.1 Schéma (extraits)

* **`mem_record`** : `ts`, `actor`, `action_key`, `scope{featureId,epicId,usId,ticketId}`, `inputs`, `outputs`, `refs_resolved[]`, `validations[]`, `status`, `notes`.
* **`mission_record`** : `ts`, `mission_id`, `source[owner|agp|pmo]`, `summary`, `scope{featureId,epicId}`, `acceptance_ref`, `priority`, `deadline?`.

### 8.2 Écritures & rétention

* JSONL journalier `.mem/{agent}/log/YYYY-MM-DD.jsonl` + index `.mem/{agent}/index.json`.
* Idempotence : coalescer les doublons `(action_key, scope, outputs)` sur 5 min.
* Rétention : `default_days: 180` (configurable via AGENT compliance).

### 8.3 Lecture rapide

* `READ_CONTEXT(scope, horizon{days}, limit)` → `records: list[mem_record]` (tri desc(ts)).

---

## 9) AGP — Contrôle sans pause (ARKORE15)

* `pause_on_delivery: false`, `ack_strategy: immediate`.
* Boucle : `ACK → CONTROL_EVALUATE → AGP_MISSION_RETURN → OPTIONAL_OWNER_CONFIRM`.
* **Zones éditables** (Z1..Z4) : ajuster ACK, checks, templates de retours, conditions d’escalade au Owner **sans toucher** aux autres briques.
* Déclencheur recommandé : action `DELIVERY_SUBMIT` (ARKORE12).

---

## 10) Event Bus (ARKORE16)

### 10.1 Concepts

* **topics** : ex. `US_CREATED`, `MEMORY_UPDATED`, `DELIVERY_RECEIVED`, `OWNER_CONFIRMATION_REQUESTED`…
* **schemas** : structure de payload (concis, stable).
* **dispatch** : `local` (scripts), `webhook` (HTTP), `stdout` (log). Retrys/backoff conseillés.
* **subscriptions** : déclarées côté AGENT (packs d’extensions).

### 10.2 Exemple

```yaml
override:
  ARKORE16-EVENT-BUS:
    dispatch:
      local:   { base_dir: "scripts/handlers/" }
      webhook: { retries: 2, backoff_ms: 800 }
    subscriptions:
      - on: US_CREATED
        using: local
        run: "us_created__issue_links.js"
      - on: OWNER_CONFIRMATION_REQUESTED
        using: webhook
        run: "${SLACK_WEBHOOK}"
```

---

## 11) Sécurité & Conformité

* **Jamais** d’override des briques CORE depuis PROFIL/AGENT (sauf refs autorisées 13/16 côté AGENT).
* **Guards** côté runner :

  * Action autorisée par le profil ?
  * Sorties dans `allow_paths` (et pas dans `deny_paths`) ?
  * Ratelimit/quotas respectés ?
* **Confidentialité** : stocker `.mem/` dans l’espace applicatif, prévoir chiffrement disque si requis.
* **Conformité client** : `ARKAA13-COMPLIANCE-POLICY` (owner confirm sur PII, rétention mémoire, etc.).

---

## 12) Maintenance, Versioning & CI

### 12.1 SemVer

* Chaque brique a `version:` et `change_policy: semver`.
* Utiliser `requires:` pour verrouiller les compatibilités inter‑moteurs (ex. PROFIL → ARKORE12@>=1.3.2).

### 12.2 Changement typique

* **CORE** : ajouter une nouvelle clé d’action → bump mineur + tests.
* **PROFIL** : ajouter un set → bump mineur ; changer une policy → bump majeur si casse possible.
* **AGENT** : changer des templates/overrides → bump patch/mineur selon impact.

### 12.3 CI (recommandé)

* **CORE CI** : ref-check (résolution `*_ref`), invariants 12/14/15/16, no‑dup‑rules.
* **PROFIL CI** : `action_sets ⊆ ARKORE12`, globs valides, `policy` ordonnée.
* **AGENT CI** : merge final + smoke tests (`US_CREATE`/`TICKET_CREATE` dry‑run), webhooks simulés.

---

## 13) Scénarios d’exemple

### 13.1 Création d’une User Story

1. Profil **lead-dev-batisseur** autorise `US_CREATE` et écrit dans `features/**/US/**/`.
2. CORE résout : regex (09), path_us (08), template_us (13), acceptance (05).
3. AGENT applique templates (file://) et publie `US_CREATED`.
4. Mémoire : append JSONL + index update.

**Commande**

```bash
bash bin/os-run.sh lead-dev-batisseur US_CREATE '{
  "featureId":"FEAT-12","epicId":"EPIC-01","usId":"US-EPIC-01-01",
  "title":"export CSV","kebab_title":"export-csv" }'
```

### 13.2 Livraison

```bash
bash bin/os-run.sh devops-guardian DELIVERY_SUBMIT '{"featureId":"FEAT-12","summary":"Livraison build 1.2"}'
```

→ AGP : ACK immédiat, contrôle, retour, escalade Owner si nécessaire.

### 13.3 Lecture de contexte mémoire (7j)

```bash
bash bin/os-run.sh arka-scribe READ_CONTEXT '{"scope":{"featureId":"FEAT-12"},"horizon":{"days":7},"limit":20}'
```

---

## 14) Dépannage

* **`yq` introuvable** : installer via `winget` (Win) ou Homebrew (macOS). Le runtime n’en a pas besoin si les bundles sont embarqués.
* **Refs non résolues** : vérifier activation/INDEX, version `requires:`.
* **Le LLM “voit trop de règles”** : n’exposez que **ARKORE12** ; le runner résout les refs.
* **Erreurs webhook** : ne bloquent pas l’action ; voir logs Event Bus, ajuster retries/backoff.
* **Chemins Windows `file://`** : format `file:///C:/...` (le runner normalise).

---

## 15) Glossaire (extraits)

* **Action key** : API opérationnelle compacte pour LLM (ARKORE12).
* **AGP** : contrôleur gouvernance temps réel, sans pause (ARKORE15).
* **Evidence** : traces de réalisation (tickets, documents, résultats de tests).
* **Template provider** : mapping file:// vers des modèles Markdown externes (ARKORE13 via AGENT).

---

## 16) Annexes

### 16.1 Ex. `mem_record` (JSONL)

```json
{"ts":"2025-09-27T12:00:03Z","actor":"lead-dev-batisseur","action_key":"US_CREATE","scope":{"featureId":"FEAT-12","epicId":"EPIC-01","usId":"US-EPIC-01-01"},"inputs":{"title":"export CSV"},"outputs":{"dir":"features/FEAT-12-export-csv/..."},"refs_resolved":["ARKORE08:path_templates.us_dir","ARKORE13:us.readme"],"validations":["regex.user_story:ok"],"status":"success"}
```

### 16.2 Ex. `PLAN-DIRECTEUR` (AGENT)

```yaml
id: ARKAA15-PLAN-DIRECTEUR
exports:
  director_plan:
    vision_ref:    "https://exemple.com/vision"
    objectifs_ref: "file://${WORKDIR}/docs/objectifs.md"
    actions_ref:   "file://${WORKDIR}/docs/actions.md"
    roadmap_ref:   "https://exemple.com/roadmap"
  prompt_shortcuts:
    PD_VISION:    "ARKAA15-PLAN-DIRECTEUR:director_plan.vision_ref"
    PD_ROADMAP:   "ARKAA15-PLAN-DIRECTEUR:director_plan.roadmap_ref"
```

---

## 17) Licence & Contacts

Choisir une licence (MIT/Apache‑2.0).
Contacts : Owner, AGP, PMO.

> **Fin** — Ce manuel est la base “spec” à embarquer dans l’app ARKA‑labs (desktop/CLI). Gardez ce README **synchro** avec vos bundles.
#   A R K A _ O S  
 