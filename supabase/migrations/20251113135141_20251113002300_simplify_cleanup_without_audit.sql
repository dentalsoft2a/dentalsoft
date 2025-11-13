/*
  # Simplification du nettoyage sans audit_log
  
  Cette migration simplifie la fonction de nettoyage en retirant
  le log dans audit_log qui n'est pas nécessaire pour cette opération.
*/

-- Simplifier la fonction sans log audit_log
CREATE OR REPLACE FUNCTION cleanup_old_refused_requests()
RETURNS json AS $$
DECLARE
  v_deleted_delivery_notes INTEGER := 0;
  v_deleted_quote_requests INTEGER := 0;
  v_result json;
BEGIN
  -- Supprimer les delivery_notes refusées de plus de 5 mois
  DELETE FROM delivery_notes
  WHERE status = 'refused'
    AND rejected_at IS NOT NULL
    AND rejected_at < NOW() - INTERVAL '5 months';
  
  GET DIAGNOSTICS v_deleted_delivery_notes = ROW_COUNT;
  
  -- Supprimer les quote_requests rejetées de plus de 5 mois
  -- Utiliser updated_at car quote_requests n'a pas de rejected_at
  DELETE FROM quote_requests
  WHERE status = 'rejected'
    AND updated_at IS NOT NULL
    AND updated_at < NOW() - INTERVAL '5 months';
  
  GET DIAGNOSTICS v_deleted_quote_requests = ROW_COUNT;
  
  -- Construire et retourner le résultat JSON
  v_result := json_build_object(
    'deleted_delivery_notes', v_deleted_delivery_notes,
    'deleted_quote_requests', v_deleted_quote_requests,
    'total_deleted', v_deleted_delivery_notes + v_deleted_quote_requests,
    'cleaned_at', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_refused_requests() IS 
  'Supprime automatiquement les demandes refusées de plus de 5 mois (delivery_notes avec rejected_at > 5 mois, quote_requests avec updated_at > 5 mois)';
