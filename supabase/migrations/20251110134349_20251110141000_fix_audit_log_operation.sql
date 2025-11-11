/*
  # Correction de l'opération d'audit pour les INSERT

  1. Modifications
    - Mapper TG_OP 'INSERT' vers 'CREATE' dans le trigger
    - Permettre 'INSERT' dans la contrainte CHECK

  2. Sécurité
    - Aucune modification de sécurité
*/

-- Mettre à jour la contrainte CHECK pour accepter INSERT
ALTER TABLE audit_log
DROP CONSTRAINT IF EXISTS audit_log_operation_check;

ALTER TABLE audit_log
ADD CONSTRAINT audit_log_operation_check
CHECK (operation IN ('CREATE', 'INSERT', 'UPDATE', 'DELETE'));

-- Mettre à jour la fonction trigger pour mapper INSERT -> CREATE
CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_hash TEXT;
  v_prev_hash TEXT;
  v_laboratory_id UUID;
  v_user_id UUID;
  v_operation TEXT;
BEGIN
  -- Récupérer l'user_id du context
  v_user_id := auth.uid();

  -- Récupérer le laboratory_id
  IF TG_OP = 'DELETE' THEN
    v_laboratory_id := OLD.user_id;
  ELSE
    v_laboratory_id := NEW.user_id;
  END IF;

  -- Mapper INSERT vers CREATE pour le journal d'audit
  v_operation := CASE
    WHEN TG_OP = 'INSERT' THEN 'CREATE'
    ELSE TG_OP
  END;

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
    v_operation,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_hash,
    v_prev_hash,
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;