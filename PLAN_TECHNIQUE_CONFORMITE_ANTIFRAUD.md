# Plan Technique - Conformité Anti-Fraude TVA
## DentalCloud - Mise en conformité Loi n° 2015-1785 (Article 286 du CGI)

**Date**: 2025-01-08
**Version**: 1.0
**Application**: DentalCloud
**Stack technique**:
- Frontend: React 18.3 + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Edge Functions)
- PDF: jsPDF 3.0.3
- Authentification: Supabase Auth

---

## 1. ANALYSE DE L'EXISTANT

### 1.1 Architecture actuelle
- Application web progressive (PWA) React/TypeScript
- Base de données PostgreSQL via Supabase
- Système de facturation existant avec:
  - Bons de livraison (`delivery_notes`)
  - Proformas (`proformas`)
  - Factures (`invoices`)
  - Avoirs (`credit_notes`)
- Génération PDF basique via jsPDF
- Stockage cloud Supabase Storage

### 1.2 Tables concernées par la conformité
```sql
- invoices (factures)
- proformas (devis/proformas)
- credit_notes (avoirs)
- delivery_notes (bons de livraison)
- invoice_items (lignes de facture)
- proforma_items (lignes de proforma)
```

---

## 2. EXIGENCES LÉGALES ET TECHNIQUES

### 2.1 Traçabilité (Article 286, I, 3° bis du CGI)
✅ **Obligation**: Enregistrement chronologique et inaltérable de toutes les opérations

**Implémentation**:
- Table `audit_log` pour tracer toutes les modifications
- Horodatage UTC avec `created_at` immuable
- Hash SHA-256 de chaque enregistrement
- Chaînage cryptographique entre enregistrements successifs

### 2.2 Sécurisation des données
✅ **Obligation**: Garantir l'intégrité, la conservation et l'inaltérabilité

**Implémentation**:
- Table `data_seals` pour les scellements périodiques
- Hash SHA-256 des archives
- Signature numérique avec clé privée RSA
- Fonction PostgreSQL pour vérifier l'intégrité de la chaîne

### 2.3 Signature électronique
✅ **Obligation**: Signature des factures avec certificat qualifié

**Implémentation**:
- Génération de paire de clés RSA (4096 bits)
- Stockage sécurisé de la clé privée (chiffrée)
- Signature PKCS#7 de chaque facture
- Ajout du champ `digital_signature` aux factures

### 2.4 Format Factur-X
✅ **Obligation**: Factures au format PDF/A-3 avec XML embarqué

**Implémentation**:
- Génération PDF/A-3 conforme
- XML au format EN 16931 (facture électronique européenne)
- Fichier PDF + XML embarqué
- Métadonnées XMP pour Factur-X

### 2.5 Archivage
✅ **Obligation**: Conservation 6 ans minimum

**Implémentation**:
- Table `archived_documents` avec versioning
- Stockage Supabase Storage avec lifecycle policy
- Chiffrement AES-256 des archives
- Export automatique trimestriel

### 2.6 Clôture périodique
✅ **Obligation**: Clôture mensuelle/annuelle avec scellement

**Implémentation**:
- Table `fiscal_periods` pour les périodes
- Processus automatisé de clôture
- Scellement SHA-256 avec timestamp
- Impossibilité de modifier les périodes closes

---

## 3. SCHÉMA DE BASE DE DONNÉES

### 3.1 Nouvelles tables

#### Table `audit_log`
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number BIGSERIAL UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  laboratory_id UUID REFERENCES profiles(id),
  entity_type TEXT NOT NULL, -- 'invoice', 'credit_note', 'proforma'
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  previous_data JSONB,
  new_data JSONB NOT NULL,
  hash_sha256 TEXT NOT NULL,
  previous_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  is_sealed BOOLEAN DEFAULT false,
  seal_id UUID REFERENCES data_seals(id)
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_sequence ON audit_log(sequence_number);
CREATE INDEX idx_audit_log_laboratory ON audit_log(laboratory_id);
```

#### Table `data_seals`
```sql
CREATE TABLE data_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  seal_type TEXT NOT NULL, -- 'daily', 'monthly', 'yearly'
  records_count INTEGER NOT NULL,
  first_sequence BIGINT NOT NULL,
  last_sequence BIGINT NOT NULL,
  combined_hash TEXT NOT NULL,
  digital_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  sealed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_data_seals_laboratory ON data_seals(laboratory_id);
CREATE INDEX idx_data_seals_period ON data_seals(period_start, period_end);
```

#### Table `fiscal_periods`
```sql
CREATE TABLE fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL,
  period_type TEXT NOT NULL, -- 'month', 'quarter', 'year'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL, -- 'open', 'closed', 'archived'
  invoices_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  seal_hash TEXT,
  seal_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_period UNIQUE(laboratory_id, period_start, period_end)
);

CREATE INDEX idx_fiscal_periods_laboratory ON fiscal_periods(laboratory_id);
CREATE INDEX idx_fiscal_periods_status ON fiscal_periods(status);
```

#### Table `digital_certificates`
```sql
CREATE TABLE digital_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  certificate_type TEXT DEFAULT 'self_signed' NOT NULL,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  key_algorithm TEXT DEFAULT 'RSA-4096' NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT now() NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  issuer TEXT,
  subject TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_digital_certificates_laboratory ON digital_certificates(laboratory_id);
```

#### Table `archived_documents`
```sql
CREATE TABLE archived_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL,
  document_type TEXT NOT NULL, -- 'invoice', 'credit_note', 'proforma'
  document_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  encryption_key_id TEXT,
  facturx_xml TEXT,
  digital_signature TEXT,
  retention_until DATE NOT NULL, -- 6 ans minimum

  CONSTRAINT unique_document UNIQUE(laboratory_id, document_type, document_id)
);

CREATE INDEX idx_archived_documents_laboratory ON archived_documents(laboratory_id);
CREATE INDEX idx_archived_documents_fiscal ON archived_documents(fiscal_year, fiscal_month);
CREATE INDEX idx_archived_documents_retention ON archived_documents(retention_until);
```

### 3.2 Modifications des tables existantes

#### Table `invoices`
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_xml TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hash_sha256 TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
```

#### Table `credit_notes`
```sql
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS facturx_xml TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS hash_sha256 TEXT;
```

---

## 4. FONCTIONS ET TRIGGERS POSTGRESQL

### 4.1 Fonction de calcul de hash
```sql
CREATE OR REPLACE FUNCTION calculate_document_hash(doc_data JSONB)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(doc_data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 4.2 Fonction d'audit automatique
```sql
CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_hash TEXT;
  v_prev_hash TEXT;
  v_laboratory_id UUID;
BEGIN
  -- Récupérer le laboratory_id
  IF TG_OP = 'DELETE' THEN
    v_laboratory_id := OLD.user_id;
  ELSE
    v_laboratory_id := NEW.user_id;
  END IF;

  -- Récupérer le hash précédent
  SELECT hash_sha256 INTO v_prev_hash
  FROM audit_log
  WHERE laboratory_id = v_laboratory_id
  ORDER BY sequence_number DESC
  LIMIT 1;

  -- Calculer le nouveau hash
  IF TG_OP = 'DELETE' THEN
    v_hash := calculate_document_hash(to_jsonb(OLD) || jsonb_build_object('prev_hash', COALESCE(v_prev_hash, '')));
  ELSE
    v_hash := calculate_document_hash(to_jsonb(NEW) || jsonb_build_object('prev_hash', COALESCE(v_prev_hash, '')));
  END IF;

  -- Insérer l'entrée d'audit
  INSERT INTO audit_log (
    user_id,
    laboratory_id,
    entity_type,
    entity_id,
    operation,
    previous_data,
    new_data,
    hash_sha256,
    previous_hash,
    ip_address
  ) VALUES (
    auth.uid(),
    v_laboratory_id,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_hash,
    v_prev_hash,
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Triggers d'audit
```sql
-- Factures
CREATE TRIGGER audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

-- Avoirs
CREATE TRIGGER audit_credit_notes
AFTER INSERT OR UPDATE OR DELETE ON credit_notes
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

-- Proformas (optionnel mais recommandé)
CREATE TRIGGER audit_proformas
AFTER INSERT OR UPDATE OR DELETE ON proformas
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();
```

### 4.4 Fonction de vérification de l'intégrité
```sql
CREATE OR REPLACE FUNCTION verify_audit_chain(p_laboratory_id UUID, p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (
  sequence_number BIGINT,
  is_valid BOOLEAN,
  calculated_hash TEXT,
  stored_hash TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH chain AS (
    SELECT
      al.sequence_number,
      al.hash_sha256,
      al.previous_hash,
      al.new_data,
      LAG(al.hash_sha256) OVER (ORDER BY al.sequence_number) as expected_prev_hash
    FROM audit_log al
    WHERE al.laboratory_id = p_laboratory_id
    ORDER BY al.sequence_number DESC
    LIMIT p_limit
  )
  SELECT
    c.sequence_number,
    (c.previous_hash = c.expected_prev_hash OR c.expected_prev_hash IS NULL) as is_valid,
    calculate_document_hash(c.new_data || jsonb_build_object('prev_hash', COALESCE(c.expected_prev_hash, ''))) as calculated_hash,
    c.hash_sha256 as stored_hash
  FROM chain c;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. EDGE FUNCTIONS SUPABASE

### 5.1 Fonction: generate-digital-certificate
**Fichier**: `supabase/functions/generate-digital-certificate/index.ts`

```typescript
// Génère une paire de clés RSA pour le laboratoire
// Stocke la clé publique et la clé privée chiffrée
// Retourne le certificat auto-signé
```

### 5.2 Fonction: sign-invoice
**Fichier**: `supabase/functions/sign-invoice/index.ts`

```typescript
// Récupère la facture
// Calcule le hash SHA-256 du contenu
// Signe le hash avec la clé privée
// Sauvegarde la signature dans la facture
// Retourne la signature
```

### 5.3 Fonction: generate-facturx
**Fichier**: `supabase/functions/generate-facturx/index.ts`

```typescript
// Génère le XML EN 16931
// Crée le PDF/A-3
// Embarque le XML dans le PDF
// Ajoute les métadonnées XMP
// Retourne le fichier Factur-X
```

### 5.4 Fonction: seal-period
**Fichier**: `supabase/functions/seal-period/index.ts`

```typescript
// Récupère tous les enregistrements de la période
// Calcule le hash combiné
// Signe le hash avec la clé privée
// Marque les enregistrements comme scellés
// Crée l'entrée dans data_seals
```

### 5.5 Fonction: archive-documents
**Fichier**: `supabase/functions/archive-documents/index.ts`

```typescript
// Récupère les documents à archiver
// Génère les PDF Factur-X
// Chiffre les documents (AES-256)
// Upload vers Supabase Storage
// Crée les entrées dans archived_documents
```

### 5.6 Fonction: export-ppf
**Fichier**: `supabase/functions/export-ppf/index.ts`

```typescript
// Génère les fichiers Factur-X des factures
// Crée le fichier de flux (manifest)
// Prépare l'export pour PPF/PDP
// Retourne un fichier ZIP
```

---

## 6. COMPOSANTS FRONTEND

### 6.1 Hook: useAntifraud
```typescript
// Hook personnalisé pour la gestion anti-fraude
// Vérifie si un document est verrouillé
// Gère la signature électronique
// Gère l'archivage
```

### 6.2 Composant: AntifraudStatus
```typescript
// Affiche le statut de conformité
// Badge de signature
// Statut d'archivage
// Période fiscale
```

### 6.3 Composant: FiscalPeriodManager
```typescript
// Interface de gestion des périodes fiscales
// Clôture de période
// Consultation des scellements
// Vérification d'intégrité
```

### 6.4 Composant: AuditLogViewer
```typescript
// Visualisation du journal d'audit
// Recherche et filtrage
// Export des logs
// Vérification de la chaîne
```

### 6.5 Composant: ComplianceCertificate
```typescript
// Génération de l'attestation de conformité
// Téléchargement PDF
// Informations légales
```

---

## 7. FLUX DE TRAITEMENT

### 7.1 Création d'une facture
```
1. Utilisateur crée une facture
2. Frontend envoie les données
3. Backend crée l'enregistrement dans `invoices`
4. Trigger `audit_invoices` crée automatiquement une entrée dans `audit_log`
5. Edge function `sign-invoice` signe la facture
6. Génération du hash SHA-256
7. Mise à jour de la facture avec signature et hash
8. Frontend affiche la facture signée
```

### 7.2 Modification d'une facture
```
1. Frontend vérifie si `is_locked = false`
2. Si locked, bloquer la modification
3. Sinon, permettre la modification
4. Trigger audit enregistre l'ancienne et la nouvelle version
5. Recalcul du hash
6. Nouvelle signature
7. Mise à jour de l'entrée audit
```

### 7.3 Clôture mensuelle
```
1. Cron job ou action manuelle déclenche la clôture
2. Edge function `seal-period` :
   - Récupère toutes les factures du mois
   - Calcule le hash combiné
   - Signe le hash
   - Marque toutes les factures comme `is_locked = true`
   - Crée l'entrée dans `data_seals`
   - Crée/met à jour `fiscal_periods`
3. Les factures ne peuvent plus être modifiées
4. Archive automatique déclenchée
```

### 7.4 Archivage
```
1. Cron job quotidien ou hebdomadaire
2. Edge function `archive-documents` :
   - Récupère les documents non archivés
   - Génère les PDF Factur-X
   - Chiffre avec AES-256
   - Upload vers Supabase Storage
   - Crée entrée dans `archived_documents`
   - Marque comme archivé
3. Calcul de `retention_until` = date + 6 ans
```

### 7.5 Export PPF/PDP
```
1. Utilisateur demande l'export
2. Sélection de la période
3. Edge function `export-ppf` :
   - Génère tous les Factur-X de la période
   - Crée le manifest XML
   - Crée un fichier ZIP
   - Retourne le ZIP pour téléchargement
4. Utilisateur upload sur le portail PPF
```

---

## 8. SÉCURITÉ

### 8.1 Chiffrement
- **Clés privées**: Chiffrées avec AES-256 + passphrase
- **Archives**: Chiffrées avec AES-256
- **Transmission**: HTTPS/TLS 1.3
- **Stockage**: Supabase Storage avec encryption at rest

### 8.2 Contrôle d'accès
- RLS (Row Level Security) sur toutes les tables
- Seul le propriétaire peut voir ses données
- Super admin peut voir les logs d'audit (conformité)
- Employés en lecture seule selon permissions

### 8.3 Intégrité
- Hash SHA-256 de chaque document
- Chaînage cryptographique des logs
- Fonction de vérification automatique
- Alert en cas de rupture de chaîne

### 8.4 Non-répudiation
- Signature numérique de chaque facture
- Horodatage avec serveur NTP
- Logs d'audit immuables
- Conservation de l'historique complet

---

## 9. PERFORMANCES

### 9.1 Optimisations
- Index sur `sequence_number`, `laboratory_id`, `entity_id`
- Partitioning de `audit_log` par année
- Archivage des logs > 2 ans dans table séparée
- Compression des archives

### 9.2 Volumétrie estimée
- 1 facture = 1 entrée audit (~5 KB)
- 1 laboratoire = ~200 factures/mois
- 1 an = 2400 factures = 12 MB de logs
- 100 laboratoires = 1.2 GB/an

---

## 10. TESTS

### 10.1 Tests unitaires
- ✅ Calcul de hash
- ✅ Génération de signature
- ✅ Vérification de chaîne
- ✅ Génération Factur-X XML
- ✅ Chiffrement/déchiffrement

### 10.2 Tests d'intégration
- ✅ Workflow complet de facture
- ✅ Clôture de période
- ✅ Archivage
- ✅ Restauration d'archive
- ✅ Export PPF

### 10.3 Tests de sécurité
- ✅ Tentative de modification de facture verrouillée
- ✅ Tentative de modification de log d'audit
- ✅ Vérification de l'intégrité après tentative d'altération
- ✅ Test de force brute sur les clés

---

## 11. PLANNING DE MISE EN ŒUVRE

### Phase 1: Infrastructure (Semaine 1-2)
- ✅ Création des tables
- ✅ Création des fonctions et triggers
- ✅ Tests unitaires base de données

### Phase 2: Signature et Traçabilité (Semaine 3-4)
- ✅ Génération de certificats
- ✅ Signature électronique
- ✅ Audit automatique
- ✅ Tests d'intégration

### Phase 3: Factur-X (Semaine 5-6)
- ✅ Génération XML EN 16931
- ✅ Génération PDF/A-3
- ✅ Intégration XML dans PDF
- ✅ Tests de conformité

### Phase 4: Clôture et Archivage (Semaine 7-8)
- ✅ Système de clôture périodique
- ✅ Archivage automatique
- ✅ Chiffrement
- ✅ Tests de conservation

### Phase 5: Export PPF (Semaine 9)
- ✅ Format d'export
- ✅ Génération de manifest
- ✅ Tests d'export

### Phase 6: Interface utilisateur (Semaine 10-11)
- ✅ Composants React
- ✅ Visualisation conformité
- ✅ Gestion périodes fiscales
- ✅ Tests UI

### Phase 7: Documentation et déploiement (Semaine 12)
- ✅ Documentation utilisateur
- ✅ Documentation technique
- ✅ Attestation de conformité
- ✅ Déploiement en production
- ✅ Formation utilisateurs

---

## 12. MAINTENANCE

### 12.1 Tâches automatisées
- **Quotidien**:
  - Archivage des nouvelles factures
  - Vérification d'intégrité
  - Sauvegarde chiffrée

- **Mensuel**:
  - Clôture de période (J+5 du mois suivant)
  - Scellement des données
  - Génération rapport de conformité

- **Annuel**:
  - Clôture annuelle
  - Archivage longue durée
  - Renouvellement certificat (si nécessaire)
  - Audit de conformité

### 12.2 Monitoring
- Alertes si rupture de chaîne d'intégrité
- Alertes si échec de signature
- Alertes si archivage en échec
- Dashboard de conformité pour super admin

---

## 13. COÛTS ESTIMÉS

### 13.1 Développement
- Infrastructure BDD: 80h
- Signature et traçabilité: 120h
- Factur-X: 100h
- Clôture et archivage: 60h
- Export PPF: 40h
- Interface utilisateur: 80h
- Documentation: 40h
- Tests: 80h
**Total**: ~600h

### 13.2 Infrastructure (Supabase)
- Database: Plan Pro (~$25/mois)
- Storage: ~$0.021/GB/mois
- Edge Functions: ~$2/100K invocations
**Estimation**: ~$50-100/mois pour 100 laboratoires

---

## 14. RISQUES ET MITIGATION

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Perte de clé privée | Critique | Faible | Backup chiffré multiple, escrow |
| Corruption de données | Critique | Faible | Vérification intégrité quotidienne |
| Performance dégradée | Moyen | Moyen | Index, partitioning, caching |
| Non-conformité NF525 | Moyen | Faible | Audit externe, documentation |
| Échec d'archivage | Élevé | Faible | Retry automatique, alertes |

---

## CONCLUSION

Ce plan technique détaille l'implémentation complète de la conformité anti-fraude TVA pour DentalCloud. L'approche privilégie:
- ✅ La sécurité et l'intégrité des données
- ✅ L'automatisation maximale
- ✅ La traçabilité complète
- ✅ La facilité d'utilisation
- ✅ La conformité légale stricte

La solution proposée permet de délivrer une **attestation individuelle de conformité** sans nécessiter la certification NF525, tout en respectant scrupuleusement les exigences de l'article 286 du CGI.
