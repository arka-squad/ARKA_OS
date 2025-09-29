# 📖 Référence API ARKA_OS

> Documentation complète des 96 actions disponibles dans ARKA_OS v2.0.0

## Table des Matières

- [Structure Projet](#structure-projet) (32 actions)
- [Livrables](#livrables) (45 actions)
- [Gouvernance](#gouvernance) (12 actions)
- [Support](#support) (7 actions)
- [Formats Communs](#formats-communs)
- [Codes d'Erreur](#codes-derreur)

---

## 🏗️ Structure Projet

### FEATURE_* (8 actions)

#### FEATURE_CREATE
Créer une nouvelle feature.

```bash
bash bin/os-run.sh technical-architect FEATURE_CREATE '{
  "featureId": "FEAT-01",
  "title": "Système de paiement",
  "kebab_title": "systeme-paiement"
}'
```

**Inputs:**
- `featureId` (string, required) - Identifiant unique format FEAT-XX
- `title` (string, required) - Titre descriptif
- `kebab_title` (string, required) - Titre en kebab-case

**Outputs:**
- `created.dir` - Chemin du répertoire créé
- `created.files` - Liste des fichiers créés

**Validations:**
- Regex : `^FEAT-[0-9]{2,}-[a-z0-9-]+$`
- Pas d'espaces dans les noms
- Structure conforme

#### FEATURE_READ
Lire une feature existante.

```bash
bash bin/os-run.sh agp FEATURE_READ '{
  "featureId": "FEAT-01"
}'
```

#### FEATURE_UPDATE
Mettre à jour une feature.

```bash
bash bin/os-run.sh agp FEATURE_UPDATE '{
  "featureId": "FEAT-01",
  "updates": {
    "title": "Nouveau titre",
    "status": "in_progress"
  }
}'
```

#### FEATURE_DELETE
Supprimer une feature (archivage).

```bash
bash bin/os-run.sh agp FEATURE_DELETE '{
  "featureId": "FEAT-01",
  "reason": "Obsolète"
}'
```

#### FEATURE_MOVE
Déplacer une feature.

```bash
bash bin/os-run.sh agp FEATURE_MOVE '{
  "featureId": "FEAT-01",
  "destination": "archives/2025/"
}'
```

#### FEATURE_RENAME
Renommer une feature.

```bash
bash bin/os-run.sh agp FEATURE_RENAME '{
  "featureId": "FEAT-01",
  "newId": "FEAT-02",
  "newTitle": "Nouveau système"
}'
```

#### FEATURE_ARCHIVE
Archiver une feature.

```bash
bash bin/os-run.sh archiviste FEATURE_ARCHIVE '{
  "featureId": "FEAT-01"
}'
```

#### FEATURE_STATUS
Changer le statut d'une feature.

```bash
bash bin/os-run.sh agp FEATURE_STATUS '{
  "featureId": "FEAT-01",
  "status": "completed"
}'
```

---

### EPIC_* (8 actions)

#### EPIC_CREATE
Créer un epic dans une feature.

```bash
bash bin/os-run.sh pmo EPIC_CREATE '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-FEAT-01-01",
  "title": "Backend API",
  "kebab_title": "backend-api"
}'
```

**Format:** `^EPIC-FEAT-[0-9]{2,}-[0-9]{2,}-[a-z0-9-]+$`

*(Autres actions EPIC_* suivent le même pattern que FEATURE_*)*

---

### US_* (8 actions)

#### US_CREATE
Créer une User Story.

```bash
bash bin/os-run.sh pmo US_CREATE '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-FEAT-01-01",
  "usId": "US-EPIC-01-01-001",
  "title": "Authentification utilisateur",
  "kebab_title": "authentification-utilisateur"
}'
```

**Format:** `^US-EPIC-[0-9]{2,}-[0-9]{2,}-[a-z0-9-]+$`

**Structure créée:**
```
features/FEAT-01/epics/EPIC-01/US/US-001/
├── README.md
├── evidence/
└── tickets/
```

*(Autres actions US_* suivent le même pattern)*

---

### TICKET_* (9 actions)

#### TICKET_CREATE
Créer un ticket de travail.

```bash
bash bin/os-run.sh lead-dev-batisseur TICKET_CREATE '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-01",
  "usId": "US-001",
  "ticketId": "TCK-US-001-01",
  "title": "Implémenter login",
  "kebab_title": "implementer-login"
}'
```

**Format:** `^TCK-US-[0-9]{2,}-[0-9]{2,}-[0-9]{2,}-[a-z0-9-]+$`

#### TICKET_CLOSE
Fermer un ticket et archiver les preuves.

```bash
bash bin/os-run.sh lead-dev-batisseur TICKET_CLOSE '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-01",
  "usId": "US-001",
  "ticketId": "TCK-US-001-01"
}'
```

**Fichiers archivés:**
- `*_SUMMARY.md`
- `*_TESTS.md`
- `*_PERF.md`
- `approvals.json`

*(Autres actions TICKET_* suivent le même pattern)*

---

## 📄 Livrables

### DOCUMENT_* (9 actions)

#### DOCUMENT_CREATE
Créer un document.

```bash
bash bin/os-run.sh agp DOCUMENT_CREATE '{
  "documentId": "DOC-SPEC-001",
  "title": "Spécification technique",
  "content": "# Spec\n\n## Contexte...",
  "type": "SPEC",
  "scope": {
    "featureId": "FEAT-01"
  }
}'
```

**Format:** `^DOC-[A-Z]+-[0-9]{3}-[a-z0-9-]+$`

**Types disponibles:**
- `SPEC` - Spécification
- `ADR` - Architecture Decision Record
- `RFC` - Request for Comments
- `GUIDE` - Guide utilisateur
- `API` - Documentation API

#### DOCUMENT_PUBLISH
Publier un document.

```bash
bash bin/os-run.sh agp DOCUMENT_PUBLISH '{
  "documentId": "DOC-SPEC-001",
  "version": "1.0.0",
  "channels": ["internal", "public"]
}'
```

---

### REPORT_* (9 actions)

#### REPORT_CREATE
Créer un rapport.

```bash
bash bin/os-run.sh qa-testeur REPORT_CREATE '{
  "reportId": "RPT-TEST-001-20250129",
  "type": "TEST",
  "title": "Rapport de tests unitaires",
  "date": "20250129",
  "content": "..."
}'
```

**Format:** `^RPT-[A-Z]+-[0-9]{3}-[0-9]{8}$`

**Types:**
- `TEST` - Tests
- `PERF` - Performance
- `AUDIT` - Audit
- `SECURITY` - Sécurité
- `QUALITY` - Qualité

---

### ANALYSIS_* (9 actions)

#### ANALYSIS_CREATE
Créer une analyse.

```bash
bash bin/os-run.sh market-research-specialist ANALYSIS_CREATE '{
  "analysisId": "ANL-MARKET-001",
  "scope": "MARKET",
  "title": "Analyse concurrentielle",
  "kebab_title": "analyse-concurrentielle"
}'
```

**Format:** `^ANL-[A-Z]+-[0-9]{3}-[a-z0-9-]+$`

---

### PLAN_* (9 actions)

#### PLAN_CREATE
Créer un plan.

```bash
bash bin/os-run.sh pmo PLAN_CREATE '{
  "planId": "PLN-RELEASE-001-v1.0",
  "type": "RELEASE",
  "title": "Plan de release v1.0",
  "version": "1.0"
}'
```

**Format:** `^PLN-[A-Z]+-[0-9]{3}-v[0-9]+\.[0-9]+$`

---

### CONTRACT_* (9 actions)

#### CONTRACT_CREATE
Créer un contrat.

```bash
bash bin/os-run.sh agp CONTRACT_CREATE '{
  "contractId": "CTR-CLIENT-001-20250129",
  "parties": "CLIENT",
  "date": "20250129",
  "title": "Contrat de service"
}'
```

**Format:** `^CTR-[A-Z]+-[0-9]{3}-[0-9]{8}$`

---

## 👮 Gouvernance

### ORDER_* (8 actions)

#### ORDER_CREATE
Créer un ordre de mission.

```bash
bash bin/os-run.sh agp ORDER_CREATE '{
  "orderId": "ORD-S1-001-PMO",
  "severity": "S1",
  "target": "PMO",
  "directive": "Préparer rapport urgent",
  "deadline": "2025-01-30T17:00:00Z"
}'
```

**Format:** `^ORD-S[0-3]-[0-9]{3}-[A-Z]+$`

**Sévérités:**
- `S0` - Critique (immédiat)
- `S1` - Urgent (4h)
- `S2` - Normal (24h)
- `S3` - Bas (72h)

#### ORDER_ASSIGN
Assigner un ordre.

```bash
bash bin/os-run.sh agp ORDER_ASSIGN '{
  "orderId": "ORD-S1-001-PMO",
  "assignee": "lead-dev-batisseur"
}'
```

#### ORDER_VALIDATE
Valider l'exécution d'un ordre.

```bash
bash bin/os-run.sh agp ORDER_VALIDATE '{
  "orderId": "ORD-S1-001-PMO",
  "validation": "APPROVED",
  "comments": "Bien exécuté"
}'
```

#### ORDER_ESCALATE
Escalader un ordre.

```bash
bash bin/os-run.sh agp ORDER_ESCALATE '{
  "orderId": "ORD-S1-001-PMO",
  "reason": "Blocage technique",
  "to": "owner"
}'
```

---

### GATE_* (2 actions)

#### GATE_NOTIFY
Notifier un passage de gate.

```bash
bash bin/os-run.sh agp GATE_NOTIFY '{
  "gate": "AGP_VALIDATION",
  "scope": {"featureId": "FEAT-01"},
  "status": "PASSED",
  "recipients": ["pmo", "lead-dev"]
}'
```

#### GATE_BROADCAST
Diffuser une décision de gate.

```bash
bash bin/os-run.sh agp GATE_BROADCAST '{
  "gate": "RELEASE_APPROVAL",
  "decision": "APPROVED",
  "message": "Release v1.0 approuvée"
}'
```

---

### DECISION_* (2 actions)

#### DECISION_PUBLISH
Publier une décision architecturale.

```bash
bash bin/os-run.sh agp DECISION_PUBLISH '{
  "decisionId": "DEC-ARCH-001-20250129",
  "type": "ARCH",
  "title": "Choix de Node.js",
  "date": "20250129",
  "content": "..."
}'
```

**Format:** `^DEC-[A-Z]+-[0-9]{3}-[0-9]{8}$`

---

## 🛠️ Support

### DELIVERY_SUBMIT
Soumettre une livraison pour validation AGP.

```bash
bash bin/os-run.sh devops-guardian DELIVERY_SUBMIT '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-01",
  "usId": "US-001",
  "ticketId": "TCK-001",
  "summary": "Livraison feature complète"
}'
```

**Flux déclenché:**
1. `AGP_ACK_SENT` - Accusé de réception (<2s)
2. `CONTROL_EVALUATED` - Contrôles exécutés
3. `MISSION_RETURN_ISSUED` - Retour au PMO
4. `OWNER_CONFIRMATION_REQUESTED` - Si nécessaire

### MISSION_INGEST
Ingérer une mission externe.

```bash
bash bin/os-run.sh pmo MISSION_INGEST '{
  "mission_record": {
    "mission_id": "MISSION-001",
    "source": "owner",
    "summary": "Développer module paiement",
    "scope": {"featureId": "FEAT-01"},
    "priority": "high",
    "deadline": "2025-02-15T00:00:00Z"
  }
}'
```

### VALIDATE_NAMING
Valider la nomenclature.

```bash
bash bin/os-run.sh agp VALIDATE_NAMING '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-FEAT-01-01",
  "usId": "US-EPIC-01-01-001",
  "ticketId": "TCK-US-001-01"
}'
```

### ARCHIVE_CAPTURE
Capturer pour archivage.

```bash
bash bin/os-run.sh archiviste ARCHIVE_CAPTURE '{
  "featureId": "FEAT-01",
  "epicId": "EPIC-01",
  "usId": "US-001"
}'
```

### WORKFLOW_PLAN
Planifier un workflow.

```bash
bash bin/os-run.sh pmo WORKFLOW_PLAN '{
  "workflowName": "release-v1",
  "scope": {"featureId": "FEAT-01"}
}'
```

### REVIEW_DELIVERABLE
Critiquer un livrable.

```bash
bash bin/os-run.sh qa-testeur REVIEW_DELIVERABLE '{
  "deliverablePath": "features/FEAT-01/README.md",
  "reviewer": "technical-architect"
}'
```

---

## 📐 Formats Communs

### Identifiants

| Type | Format | Exemple |
|------|--------|---------|
| Feature | `FEAT-{id}-{kebab}` | `FEAT-01-paiement` |
| Epic | `EPIC-FEAT-{id}-{id}-{kebab}` | `EPIC-FEAT-01-01-backend` |
| US | `US-EPIC-{id}-{id}-{kebab}` | `US-EPIC-01-01-001-login` |
| Ticket | `TCK-US-{id}-{id}-{id}-{kebab}` | `TCK-US-001-01-01-impl` |
| Document | `DOC-{TYPE}-{id}-{kebab}` | `DOC-SPEC-001-api` |
| Report | `RPT-{TYPE}-{id}-{date}` | `RPT-TEST-001-20250129` |
| Order | `ORD-{severity}-{id}-{target}` | `ORD-S1-001-PMO` |

### Dates
- Format : `YYYYMMDD` ou ISO 8601
- Timezone : UTC par défaut

### Statuts
- `draft` - Brouillon
- `in_progress` - En cours
- `review` - En revue
- `approved` - Approuvé
- `completed` - Terminé
- `archived` - Archivé
- `rejected` - Rejeté

---

## ❌ Codes d'Erreur

| Code | Description | Solution |
|------|-------------|----------|
| `E001` | Action non trouvée | Vérifier le nom de l'action |
| `E002` | Permissions insuffisantes | Utiliser un agent autorisé |
| `E003` | Validation échouée | Vérifier le format des inputs |
| `E004` | Référence non résolue | Vérifier que la brique est activée |
| `E005` | Chemin interdit | Vérifier allow_paths du profil |
| `E006` | Rate limit dépassé | Attendre avant de réessayer |
| `E007` | Mémoire corrompue | Reconstruire l'index |
| `E008` | Event dispatch failed | Vérifier la config Event Bus |
| `E009` | Template manquant | Vérifier ARKORE13 ou overrides |
| `E010` | Conflict détecté | Résoudre manuellement |

---

## 🔗 Liens Utiles

- [Guide des Permissions](docs/PERMISSIONS.md)
- [Configuration Event Bus](docs/EVENT_BUS.md)
- [Création d'Agent](docs/CREATE_AGENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

*Dernière mise à jour : ARKA_OS v2.0.0 - Janvier 2025*