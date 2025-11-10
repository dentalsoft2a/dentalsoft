/*
  # Correction du journal d'audit pour les suppressions

  1. Modifications
    - Rendre `new_data` nullable pour permettre les DELETE
    - Ajuster la fonction verify_audit_chain pour gérer les NULL

  2. Sécurité
    - Aucune modification de sécurité
*/

-- Rendre new_data nullable pour les opérations DELETE
ALTER TABLE audit_log
ALTER COLUMN new_data DROP NOT NULL;

-- Mise à jour de la fonction de vérification d'intégrité
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
      al.previous_data,
      al.operation,
      al.entity_type,
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
      COALESCE(c.new_data, c.previous_data) ||
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
