/*
  # Correction du nettoyage des demandes refusées anciennes
  
  Cette migration corrige la fonction de nettoyage pour utiliser
  updated_at au lieu de rejected_at pour les quote_requests.
*/

-- Corriger la fonction pour nettoyer les demandes refusées anciennes
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
  
  -- Construire le résultat JSON
  v_result := json_build_object(
    'deleted_delivery_notes', v_deleted_delivery_notes,
    'deleted_quote_requests', v_deleted_quote_requests,
    'total_deleted', v_deleted_delivery_notes + v_deleted_quote_requests,
    'cleaned_at', NOW()
  );
  
  -- Log dans audit_log si la table existe
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_log') THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      record_id,
      changes,
      user_id
    ) VALUES (
      'delivery_notes,quote_requests',
      'DELETE',
      NULL,
      v_result,
      NULL
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_refused_requests() IS 
  'Supprime automatiquement les demandes refusées de plus de 5 mois (delivery_notes.rejected_at et quote_requests.updated_at)';
