## 📋 **Spec Dev : Extension ARKORE12 - 84 Actions + Orders**

### **DESTINATAIRE : Codex GPT5**
**Objectif :** Étendre ARKORE12 de 11 à 95 actions totales

---

## **1. INVENTAIRE DES ACTIONS À CRÉER**

### **1.1 CRUD sur types existants (32 actions)**
```yaml
# Pour chaque type : FEATURE, EPIC, US, TICKET
# Actions : _CREATE (existe), _READ, _UPDATE, _DELETE, _MOVE, _RENAME, _ARCHIVE, _STATUS

FEATURE: [READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS]  # 7 nouvelles
EPIC:    [READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS]  # 7 nouvelles  
US:      [READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS]  # 7 nouvelles
TICKET:  [READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS]  # 7 nouvelles
# CREATE existe déjà, CLOSE existe pour TICKET
```

### **1.2 Types métier nouveaux (45 actions)**
```yaml
# 5 types × 9 actions = 45
DOCUMENT: [CREATE, READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS, PUBLISH]
REPORT:   [CREATE, READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS, PUBLISH]
ANALYSIS: [CREATE, READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS, PUBLISH]
PLAN:     [CREATE, READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS, PUBLISH]
CONTRACT: [CREATE, READ, UPDATE, DELETE, MOVE, RENAME, ARCHIVE, STATUS, PUBLISH]
```

### **1.3 Gouvernance ORDERS (8 actions)**
```yaml
ORDER: [CREATE, READ, UPDATE, DELETE, ASSIGN, VALIDATE, CANCEL, ESCALATE]
```

### **1.4 Gates & Notifications (4 actions)**
```yaml
GATE:     [NOTIFY, BROADCAST]
DECISION: [PUBLISH, ARCHIVE]
```

---

## **2. STRUCTURE À IMPLÉMENTER**

### **2.1 Dans ARKORE12-ACTION-KEYS.yaml**

```yaml
# Structure par type (pas tout mélangé)
exports:
  action_keys:
    # Groupe 1 : Structure projet
    feature_actions:
      FEATURE_READ:
        inputs: [featureId]
        outputs: {content: object, path: string}
        validations: ["exists", "permissions"]
        post: ["ARKORE14-MEMORY-OPS:operations.MEMORY_UPDATE"]
        
      FEATURE_UPDATE:
        inputs: [featureId, updates]
        outputs: {updated: object, previous: object}
        validations: ["exists", "permissions", "valid_updates"]
        post: ["ARKORE14-MEMORY-OPS:operations.MEMORY_UPDATE"]
        
    # Groupe 2 : Types métier
    document_actions:
      DOCUMENT_CREATE:
        inputs: [documentId, title, content, type, scope]
        paths:
          dir_ref: "ARKORE08-PATHS-GOVERNANCE:deliverables.documents_root"
        naming:
          pattern_ref: "ARKORE09-NAMING-PATTERNS:patterns.document"
          regex_ref: "ARKORE09-NAMING-PATTERNS:regex.document"
        outputs: {created: path, id: string}
        validations: ["naming", "path_allowed", "quota"]
        post: ["ARKORE14-MEMORY-OPS:operations.MEMORY_UPDATE"]
        
    # Groupe 3 : Gouvernance
    order_actions:
      ORDER_CREATE:
        inputs: [orderId, severity, target, directive, deadline]
        authority_required: ["agp", "owner"]
        paths:
          dir_ref: "ARKORE08-PATHS-GOVERNANCE:orders_root"
        outputs: {order: object, notifications_sent: array}
        validations: ["authority", "target_exists", "severity_valid"]
        post: ["ARKORE14-MEMORY-OPS:operations.MEMORY_UPDATE"]
```

### **2.2 Dans ARKORE08-PATHS-GOVERNANCE.yaml**

```yaml
# AJOUTER dans paths:
deliverables:
  documents_root: "deliverables/documents/"
  reports_root: "deliverables/reports/"
  analysis_root: "deliverables/analysis/"
  plans_root: "deliverables/plans/"
  contracts_root: "deliverables/contracts/"
  
governance:
  orders_root: "orders/"
  decisions_root: "decisions/"
```

### **2.3 Dans ARKORE09-NAMING-PATTERNS.yaml**

```yaml
# AJOUTER dans patterns:
document: "DOC-{type}-{id}-{kebab_title}"
report: "RPT-{type}-{id}-{date}"
analysis: "ANL-{scope}-{id}-{kebab_title}"
plan: "PLN-{type}-{id}-{version}"
contract: "CTR-{parties}-{id}-{date}"
order: "ORD-{severity}-{id}-{target}"
decision: "DEC-{type}-{id}-{date}"

# AJOUTER dans regex:
document: "^DOC-[A-Z]+-[0-9]{3}-[a-z0-9-]+$"
report: "^RPT-[A-Z]+-[0-9]{3}-[0-9]{8}$"
analysis: "^ANL-[A-Z]+-[0-9]{3}-[a-z0-9-]+$"
plan: "^PLN-[A-Z]+-[0-9]{3}-v[0-9]+\\.[0-9]+$"
contract: "^CTR-[A-Z]+-[0-9]{3}-[0-9]{8}$"
order: "^ORD-S[0-3]-[0-9]{3}-[A-Z]+$"
decision: "^DEC-[A-Z]+-[0-9]{3}-[0-9]{8}$"
```

---

## **3. DEFINITION OF DONE (DOD)**

### **Pour CHAQUE action (95 au total) :**

- [ ] **Structure complète** avec : inputs, outputs, validations, post
- [ ] **Référence paths** vers ARKORE08 (si création/déplacement)
- [ ] **Référence naming** vers ARKORE09 (si création)
- [ ] **MEMORY_UPDATE obligatoire** dans post
- [ ] **Test unitaire** qui vérifie l'action

### **Pour l'ensemble :**

- [ ] **ARKORE12** : 95 actions organisées par groupes
- [ ] **ARKORE08** : tous les nouveaux paths ajoutés
- [ ] **ARKORE09** : tous les patterns + regex ajoutés
- [ ] **ARKPR03** : action_sets mis à jour
- [ ] **Version** : bumper ARKORE12 → 2.0.0 (breaking change)
- [ ] **Tests d'intégration** : création → read → update → delete
- [ ] **Documentation** : liste des actions dans README

### **Validation finale :**
```bash
# Doit passer sans erreur
node bin/runner.mjs DOCUMENT_CREATE '{"documentId":"DOC-SPEC-001","title":"Test","content":"..."}'
node bin/runner.mjs ORDER_CREATE '{"orderId":"ORD-S1-001","target":"PMO","directive":"..."}'
```

