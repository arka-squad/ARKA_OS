# 🚀 Guide de Démarrage Rapide ARKA_OS

Ce guide vous permet de démarrer avec ARKA_OS en **5 minutes**.

## 📋 Prérequis (2 min)

### Windows 11
```powershell
# Installer les outils requis
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install MikeFarah.yq
winget install Microsoft.PowerShell
```

### macOS
```bash
# Via Homebrew
brew install git node@18 yq
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git nodejs npm
sudo snap install yq
```

## 🎯 Installation (1 min)

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/ARKA_OS.git
cd ARKA_OS

# 2. Installer les dépendances (optionnel pour dev)
npm install

# 3. Builder les bundles
bash bin/os-build.sh    # Linux/macOS
pwsh bin/os-build.ps1   # Windows
```

## ✅ Premier Test (30 sec)

### Test 1 : Créer une User Story

```bash
# Linux/macOS
bash bin/os-run.sh lead-dev-batisseur US_CREATE '{
  "featureId":"FEAT-01",
  "epicId":"EPIC-01", 
  "usId":"US-01",
  "title":"Ma première US",
  "kebab_title":"ma-premiere-us"
}'

# Windows PowerShell
pwsh bin/os-run.ps1 -Agent lead-dev-batisseur -Action US_CREATE `
  -InputJson '{"featureId":"FEAT-01","epicId":"EPIC-01","usId":"US-01","title":"Ma première US","kebab_title":"ma-premiere-us"}'
```

**Résultat attendu :**
```json
{
  "ok": true,
  "created": {
    "dir": "features/FEAT-01-ma-premiere-us/epics/EPIC-01/US/US-01/",
    "files": ["README.md"]
  },
  "events": ["US_CREATED", "MEMORY_UPDATED"]
}
```

### Test 2 : Créer un Ticket

```bash
bash bin/os-run.sh lead-dev-batisseur TICKET_CREATE '{
  "featureId":"FEAT-01",
  "epicId":"EPIC-01",
  "usId":"US-01", 
  "ticketId":"TCK-01",
  "title":"Implémenter la fonctionnalité",
  "kebab_title":"implementer-fonctionnalite"
}'
```

### Test 3 : Soumettre une Livraison

```bash
bash bin/os-run.sh devops-guardian DELIVERY_SUBMIT '{
  "featureId":"FEAT-01",
  "summary":"Livraison de la première US"
}'
```

## 🎨 Exemples d'Usage

### Créer un Document

```bash
bash bin/os-run.sh agp DOCUMENT_CREATE '{
  "documentId":"DOC-ADR-001",
  "title":"Architecture Decision Record",
  "content":"# ADR-001: Choix de Node.js\n\n## Contexte\n...",
  "type":"ADR"
}'
```

### Créer un Ordre de Mission

```bash
bash bin/os-run.sh agp ORDER_CREATE '{
  "orderId":"ORD-S1-001",
  "severity":"S1",
  "target":"PMO",
  "directive":"Préparer rapport mensuel",
  "deadline":"2025-02-01T17:00:00Z"
}'
```

### Planifier un Workflow

```bash
bash bin/os-run.sh pmo WORKFLOW_PLAN '{
  "workflowName":"release-v1",
  "scope":{
    "featureId":"FEAT-01"
  }
}'
```

## 🔍 Vérifier les Résultats

### Structure Créée
```
features/
└── FEAT-01-ma-premiere-us/
    ├── README.md
    └── epics/
        └── EPIC-01/
            ├── README.md
            └── US/
                └── US-01-ma-premiere-us/
                    ├── README.md
                    ├── evidence/
                    └── tickets/
                        └── TCK-01/
                            ├── WORK.md
                            └── .todo.md
```

### Mémoire Persistée
```
.mem/
└── lead-dev-batisseur/
    ├── log/
    │   └── 2025-01-29.jsonl
    └── index.json
```

### Events Émis
Vérifiez la console pour voir les événements :
```json
{"event":"US_CREATED","ts":"2025-01-29T10:00:00Z","scope":{...}}
{"event":"MEMORY_UPDATED","ts":"2025-01-29T10:00:01Z","scope":{...}}
```

## 🛠️ Configuration Avancée

### Variables d'Environnement

```bash
export ARKA_PROFILE=dev              # Profil à utiliser
export ARKA_AGENT=lead-dev-batisseur # Agent par défaut
export ARKA_EVENT_WEBHOOK=https://...# Webhook pour events
export ARKA_TPL_DIR=./templates      # Dossier templates custom
```

### Fichier .env

```bash
# Créer un fichier .env à la racine
SLACK_WEBHOOK=https://hooks.slack.com/services/...
GITHUB_REPO=owner/repo
GITHUB_TOKEN=ghp_...
ARKA_TPL_DIR=./templates
```

## 🎓 Prochaines Étapes

### 1. Explorer les Agents
```bash
# Lister les agents disponibles
ls ARKA_AGENT/client/acme/experts/

# Tester différents agents
bash bin/os-run.sh agp VALIDATE_NAMING '{"featureId":"FEAT-01"}'
bash bin/os-run.sh qa-testeur TICKET_CREATE '{...}'
bash bin/os-run.sh archiviste ARCHIVE_CAPTURE '{...}'
```

### 2. Personnaliser un Agent
Voir [Guide de Création d'Agent](docs/CREATE_AGENT.md)

### 3. Ajouter des Scripts d'Événements
Voir [Guide Event Bus](docs/EVENT_BUS.md)

### 4. Configurer pour votre Client
Copier et adapter :
```bash
cp -r ARKA_AGENT/client/acme ARKA_AGENT/client/mon-client
# Éditer les fichiers ARKAA*.yaml
```

## ❓ Résolution de Problèmes

### Erreur "yq not found"
```bash
# Vérifier l'installation
yq --version

# Réinstaller si nécessaire
# Windows: winget install MikeFarah.yq
# macOS: brew install yq
# Linux: snap install yq
```

### Erreur "Assembly not found"
```bash
# Rebuilder les bundles
bash bin/os-build.sh
# Vérifier les fichiers générés
ls -la */build/*.yaml
```

### Erreur "Action not found"
```bash
# Vérifier l'action dans ARKORE12
grep "YOUR_ACTION" ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml

# Utiliser une action valide
# Liste complète : voir README.md section "Actions Disponibles"
```

## 📚 Documentation Complète

- **[README Principal](../README.md)** - Vue d'ensemble
- **[Guide Complet](GUIDE.md)** - Documentation détaillée
- **[API Reference](API.md)** - Référence des actions
- **[Architecture](ARCHITECTURE.md)** - Design système
- **[Contributing](CONTRIBUTING.md)** - Guide contribution

## 💬 Support

- **GitHub Issues** : [Signaler un bug](https://github.com/votre-org/ARKA_OS/issues)
- **Discussions** : [Forum communautaire](https://github.com/votre-org/ARKA_OS/discussions)
- **Email** : support@arka-labs.com

---

**Félicitations ! 🎉** Vous avez maintenant ARKA_OS opérationnel. 

Prochaine étape recommandée : [Créer votre premier agent personnalisé](docs/CREATE_AGENT.md)