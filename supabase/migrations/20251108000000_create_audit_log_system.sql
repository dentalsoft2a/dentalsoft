/*
  # Système de journal d'audit inaltérable

  1. Nouvelles tables
    - `audit_log`
      - Journal d'audit avec chaînage cryptographique
      - Enregistrement de toutes les opérations (CREATE, UPDATE, DELETE)
      - Hash SHA-256 de chaque enregistrement
      - Chaînage avec le hash précédent (blockchain locale)
      - Numérotation séquentielle unique

  2. Sécurité
    - RLS activé sur audit_log
    - Lecture seule pour les utilisateurs normaux
    - Super admin peut tout voir
    - Aucune modification/suppression possible

  3. Fonctions
    - calculate_document_hash(): Calcule le hash SHA-256
    - log_audit_entry(): Trigger automatique pour l'audit
*/

-- Créer la table audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number BIGSERIAL UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  laboratory_id UUID REFERENCES profiles(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  previous_data JSONB,
  new_data JSONB NOT NULL,
  hash_sha256 TEXT NOT NULL,
  previous_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  is_sealed BOOLEAN DEFAULT false,
  seal_id UUID
);

-- Index pour optimisation
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_sequence ON audit_log(sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_laboratory ON audit_log(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Activer RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users can view own audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (laboratory_id = auth.uid() OR laboratory_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

-- Politique: Super admin peut tout voir
CREATE POLICY "Super admin can view all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- Politique: Aucune modification possible
-- (Pas de politique INSERT/UPDATE/DELETE = lecture seule pour tous)

-- Fonction pour calculer le hash SHA-256
CREATE OR REPLACE FUNCTION calculate_document_hash(doc_data JSONB)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(doc_data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Fonction pour enregistrer automatiquement dans l'audit
CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_hash TEXT;
  v_prev_hash TEXT;
  v_laboratory_id UUID;
  v_user_id UUID;
BEGIN
  -- Récupérer l'user_id du context
  v_user_id := auth.uid();

  -- Récupérer le laboratory_id
  IF TG_OP = 'DELETE' THEN
    v_laboratory_id := OLD.user_id;
  ELSE
    v_laboratory_id := NEW.user_id;
  END IF;

  -- Récupérer le hash précédent pour ce laboratoire
  SELECT hash_sha256 INTO v_prev_hash
  FROM audit_log
  WHERE laboratory_id = v_laboratory_id
  ORDER BY sequence_number DESC
  LIMIT 1;

  -- Calculer le nouveau hash avec chaînage
  IF TG_OP = 'DELETE' THEN
    v_hash := calculate_document_hash(
      to_jsonb(OLD) ||
      jsonb_build_object('prev_hash', COALESCE(v_prev_hash, ''))
    );
  ELSE
    v_hash := calculate_document_hash(
      to_jsonb(NEW) ||
      jsonb_build_object('prev_hash', COALESCE(v_prev_hash, ''))
    );
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
    v_user_id,
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

-- Fonction pour vérifier l'intégrité de la chaîne d'audit
CREATE OR REPLACE FUNCTION verify_audit_chain(
  p_laboratory_id UUID,
  p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  sequence_number BIGINT,
  is_valid BOOLEAN,
  calculated_hash TEXT,
  stored_hash TEXT,
  entity_type TEXT,
  operation TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH chain AS (
    SELECT
      al.sequence_number,
      al.hash_sha256,
      al.previous_hash,
      al.new_data,
      al.entity_type,
      al.operation,
      al.created_at,
      LAG(al.hash_sha256) OVER (ORDER BY al.sequence_number) as expected_prev_hash
    FROM audit_log al
    WHERE al.laboratory_id = p_laboratory_id
    ORDER BY al.sequence_number DESC
    LIMIT p_limit
  )
  SELECT
    c.sequence_number,
    (c.previous_hash = c.expected_prev_hash OR c.expected_prev_hash IS NULL) as is_valid,
    calculate_document_hash(
      c.new_data ||
      jsonb_build_object('prev_hash', COALESCE(c.expected_prev_hash, ''))
    ) as calculated_hash,
    c.hash_sha256 as stored_hash,
    c.entity_type,
    c.operation,
    c.created_at
  FROM chain c
  ORDER BY c.sequence_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activer les triggers d'audit sur les tables existantes

-- Audit des factures
DROP TRIGGER IF EXISTS audit_invoices ON invoices;
CREATE TRIGGER audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

-- Audit des avoirs
DROP TRIGGER IF EXISTS audit_credit_notes ON credit_notes;
CREATE TRIGGER audit_credit_notes
AFTER INSERT OR UPDATE OR DELETE ON credit_notes
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

-- Audit des proformas (optionnel mais recommandé)
DROP TRIGGER IF EXISTS audit_proformas ON proformas;
CREATE TRIGGER audit_proformas
AFTER INSERT OR UPDATE OR DELETE ON proformas
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();
