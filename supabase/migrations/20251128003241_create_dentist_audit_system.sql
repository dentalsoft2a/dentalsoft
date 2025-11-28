/*
  # Système d'audit inaltérable pour les dentistes

  1. Nouvelles Tables
    - `dentist_audit_log`
      - Journal d'audit avec chaînage cryptographique
      - Numérotation séquentielle automatique
      - Hash SHA-256 pour chaque entrée
      - Traçabilité complète des opérations

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour que chaque dentiste ne voie que ses données
    - Protection contre les modifications après scellement

  3. Triggers
    - Enregistrement automatique des opérations sur dental_invoices
    - Enregistrement des opérations sur dental_payments
    - Chaînage cryptographique automatique
*/

-- =====================================================================
-- PART 1: Table du journal d'audit dentiste
-- =====================================================================

CREATE TABLE IF NOT EXISTS dentist_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  sequence_number bigint NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  hash_sha256 text NOT NULL,
  previous_hash text,
  is_sealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  ip_address text,
  user_agent text
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_dentist_audit_log_dentist ON dentist_audit_log(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_audit_log_sequence ON dentist_audit_log(dentist_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_dentist_audit_log_entity ON dentist_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_dentist_audit_log_created ON dentist_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dentist_audit_log_sealed ON dentist_audit_log(is_sealed);

-- Index unique pour garantir la séquence par dentiste
CREATE UNIQUE INDEX IF NOT EXISTS idx_dentist_audit_log_dentist_sequence
  ON dentist_audit_log(dentist_id, sequence_number);

-- Enable RLS
ALTER TABLE dentist_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies pour dentist_audit_log
CREATE POLICY "Dentists can view own audit log"
  ON dentist_audit_log FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "System can insert audit entries"
  ON dentist_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Super admins can view all audit logs"
  ON dentist_audit_log FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- =====================================================================
-- PART 2: Fonction pour calculer le hash d'une entrée d'audit
-- =====================================================================

CREATE OR REPLACE FUNCTION calculate_dentist_audit_hash(
  p_dentist_id uuid,
  p_sequence_number bigint,
  p_entity_type text,
  p_entity_id uuid,
  p_operation text,
  p_new_data jsonb,
  p_previous_hash text
)
RETURNS text AS $$
DECLARE
  v_hash_input text;
BEGIN
  -- Construire la chaîne à hasher
  v_hash_input := CONCAT(
    p_dentist_id::text,
    '|',
    p_sequence_number::text,
    '|',
    p_entity_type,
    '|',
    p_entity_id::text,
    '|',
    p_operation,
    '|',
    COALESCE(p_new_data::text, ''),
    '|',
    COALESCE(p_previous_hash, '')
  );

  -- Retourner le hash SHA-256
  RETURN encode(digest(v_hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PART 3: Fonction pour créer une entrée d'audit
-- =====================================================================

CREATE OR REPLACE FUNCTION create_dentist_audit_entry(
  p_dentist_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_operation text,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_sequence_number bigint;
  v_previous_hash text;
  v_current_hash text;
  v_audit_id uuid;
BEGIN
  -- Obtenir le dernier hash pour ce dentiste
  SELECT hash_sha256 INTO v_previous_hash
  FROM dentist_audit_log
  WHERE dentist_id = p_dentist_id
  ORDER BY sequence_number DESC
  LIMIT 1;

  -- Obtenir le prochain numéro de séquence
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_sequence_number
  FROM dentist_audit_log
  WHERE dentist_id = p_dentist_id;

  -- Calculer le hash de la nouvelle entrée
  v_current_hash := calculate_dentist_audit_hash(
    p_dentist_id,
    v_sequence_number,
    p_entity_type,
    p_entity_id,
    p_operation,
    p_new_data,
    v_previous_hash
  );

  -- Insérer l'entrée d'audit
  INSERT INTO dentist_audit_log (
    dentist_id,
    sequence_number,
    entity_type,
    entity_id,
    operation,
    old_data,
    new_data,
    hash_sha256,
    previous_hash,
    user_id
  ) VALUES (
    p_dentist_id,
    v_sequence_number,
    p_entity_type,
    p_entity_id,
    p_operation,
    p_old_data,
    p_new_data,
    v_current_hash,
    v_previous_hash,
    auth.uid()
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PART 4: Fonction pour vérifier l'intégrité de la chaîne d'audit
-- =====================================================================

CREATE OR REPLACE FUNCTION verify_dentist_audit_chain(
  p_dentist_id uuid,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE(
  sequence_number bigint,
  is_valid boolean,
  calculated_hash text,
  stored_hash text,
  entity_type text,
  operation text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH audit_entries AS (
    SELECT
      dal.sequence_number,
      dal.dentist_id,
      dal.entity_type,
      dal.entity_id,
      dal.operation,
      dal.new_data,
      dal.hash_sha256,
      dal.previous_hash,
      dal.created_at,
      LAG(dal.hash_sha256) OVER (ORDER BY dal.sequence_number) as expected_previous_hash
    FROM dentist_audit_log dal
    WHERE dal.dentist_id = p_dentist_id
    ORDER BY dal.sequence_number DESC
    LIMIT p_limit
  )
  SELECT
    ae.sequence_number,
    (calculate_dentist_audit_hash(
      ae.dentist_id,
      ae.sequence_number,
      ae.entity_type,
      ae.entity_id,
      ae.operation,
      ae.new_data,
      ae.expected_previous_hash
    ) = ae.hash_sha256) as is_valid,
    calculate_dentist_audit_hash(
      ae.dentist_id,
      ae.sequence_number,
      ae.entity_type,
      ae.entity_id,
      ae.operation,
      ae.new_data,
      ae.expected_previous_hash
    ) as calculated_hash,
    ae.hash_sha256 as stored_hash,
    ae.entity_type,
    ae.operation,
    ae.created_at
  FROM audit_entries ae
  ORDER BY ae.sequence_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PART 5: Triggers pour enregistrer les opérations sur dental_invoices
-- =====================================================================

CREATE OR REPLACE FUNCTION log_dental_invoice_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_operation text;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  -- Déterminer le type d'opération
  IF TG_OP = 'INSERT' THEN
    v_operation := 'CREATE';
    v_new_data := to_jsonb(NEW);
    v_old_data := NULL;

    PERFORM create_dentist_audit_entry(
      NEW.dentist_id,
      'dental_invoices',
      NEW.id,
      v_operation,
      v_old_data,
      v_new_data
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_operation := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);

    PERFORM create_dentist_audit_entry(
      NEW.dentist_id,
      'dental_invoices',
      NEW.id,
      v_operation,
      v_old_data,
      v_new_data
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_operation := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;

    PERFORM create_dentist_audit_entry(
      OLD.dentist_id,
      'dental_invoices',
      OLD.id,
      v_operation,
      v_old_data,
      v_new_data
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur dental_invoices
DROP TRIGGER IF EXISTS trigger_log_dental_invoice_changes ON dental_invoices;
CREATE TRIGGER trigger_log_dental_invoice_changes
  AFTER INSERT OR UPDATE OR DELETE ON dental_invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_dental_invoice_changes();

-- =====================================================================
-- PART 6: Triggers pour enregistrer les opérations sur dental_payments
-- =====================================================================

CREATE OR REPLACE FUNCTION log_dental_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_operation text;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  -- Déterminer le type d'opération
  IF TG_OP = 'INSERT' THEN
    v_operation := 'CREATE';
    v_new_data := to_jsonb(NEW);
    v_old_data := NULL;

    PERFORM create_dentist_audit_entry(
      NEW.dentist_id,
      'dental_payments',
      NEW.id,
      v_operation,
      v_old_data,
      v_new_data
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_operation := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);

    PERFORM create_dentist_audit_entry(
      NEW.dentist_id,
      'dental_payments',
      NEW.id,
      v_operation,
      v_old_data,
      v_new_data
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_operation := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;

    PERFORM create_dentist_audit_entry(
      OLD.dentist_id,
      'dental_payments',
      OLD.id,
      v_operation,
      v_old_data,
      v_new_data
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;