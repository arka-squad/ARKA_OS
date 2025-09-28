**portabilité** pour une app desktop Arka-labs (Windows/macOS/Linux).
Voici juste ce qu’il faut verrouiller pour que ça tourne partout :

## Checklist portabilité (dev & desktop)

* **Aucun binaire exotique requis au runtime** : le runner ne lit que `build/*.yaml`.
  → En dev tu peux utiliser `yq` pour builder, **mais** pour l’app desktop, **pré-génère** les 3 bundles et **embarque-les** dans les assets.
* **Chemins & templates** : utilise des `file://` **relatifs** aux assets de l’app.

  * Windows : `file:///C:/…` ; macOS/Linux : `file:///…` (ton runner doit normaliser).
  * Var env `ARKA_TPL_DIR` → répertoire d’assets de l’app.
* **Mémoire locale (ARKORE14)** : écris sous le dossier “données applicatives” par OS :

  * Win: `%APPDATA%\ArkaLabs\.mem\`
  * macOS: `~/Library/Application Support/ArkaLabs/.mem/`
  * Linux: `~/.local/share/ArkaLabs/.mem/`
    → expose `MEM_DIR` et mappe-le dans `roots_ref` (pas de chemins absolus en dur).
* **Réseau facultatif** : `net_access` vient de **PROFIL**. Tu peux fonctionner **offline** (désable `webhook` dans `ARKORE16` et garde `local`).
* **No-override de CORE** : l’app charge **en lecture seule** `core.assembly.yaml` + `profiles.bundle.yaml` + `agent assembly`.
  → Le garde (authorizer) vérifie droits/paths/ratelimits avant toute exécution.
* **Encodage/fin de ligne** : force `UTF-8` et LF (le runner tolère CRLF en lecture).
* **Horloge & locale** : fixe `Europe/Paris` par défaut (overrides via `ARKAA10-CONTEXT`).
* **Tests fumée intégrés** : au démarrage, exécuter à sec `US_CREATE` + `TICKET_CREATE` (dry-run) et vérifier écriture `.mem`.

## Deux modes conseillés

* **Dev** (portable) : `npm run build:ps|sh` + `npm run run:ps|sh` depuis `ARKA_OS/` (ce qu’on a posé).
* **App Desktop** (Electron/Tauri) : shippe les 3 bundles pré-générés dans `resources/`, mappe `ARKA_TPL_DIR` & `MEM_DIR` vers les dossiers d’app, et n’exige **aucun** outil externe.

## Prochain petit pas

* Ajoute dans `master-agent.yaml` un override `ARKORE14.storage.roots_ref` → `${MEM_DIR}`.
* Build les 3 bundles une fois, vérifie qu’ils suffisent à faire tourner l’app **sans yq** installé.

Si tu veux, je te fais le mini patch `roots_ref` + un exemple Electron/Tauri pour charger les 3 YAML depuis `resources/` et définir `MEM_DIR`/`ARKA_TPL_DIR`.
