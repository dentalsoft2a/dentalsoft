/*
  # Nettoyage automatique des demandes refusées anciennes
  
  Cette migration ajoute un système pour supprimer automatiquement
  les demandes refusées de plus de 5 mois.
  
  1. Fonction de nettoyage
    - Supprime les delivery_notes avec status = 'refused' et rejected_at > 5 mois
    - Supprime les quote_requests avec status = 'rejected' et rejected_at > 5 mois
    - Retourne le nombre d'enregistrements supprimés
  
  2. Job automatique
    - S'exécute tous les jours à 3h du matin
    - Garde l'historique frais mais supprime les très anciennes demandes
*/

-- Fonction pour nettoyer les demandes refusées anciennes
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
  DELETE FROM quote_requests
  WHERE status = 'rejected'
    AND rejected_at IS NOT NULL
    AND rejected_at < NOW() - INTERVAL '5 months';
  
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

-- Mettre à jour la fonction de maintenance quotidienne pour inclure le nettoyage
CREATE OR REPLACE FUNCTION run_daily_maintenance_complete()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_count INTEGER;
  v_cleanup_result json;
BEGIN
  -- Exécuter la maintenance de base
  v_result := run_daily_maintenance();
  
  -- Ajouter le nettoyage des comptes dentistes orphelins
  v_count := cleanup_orphaned_dentist_auth_accounts();
  v_result := v_result || format('Orphaned dentist auth accounts cleaned: %s\n', v_count);
  
  -- Ajouter le nettoyage des comptes laboratoires orphelins
  v_count := cleanup_orphaned_laboratory_auth_accounts();
  v_result := v_result || format('Orphaned laboratory auth accounts cleaned: %s\n', v_count);
  
  -- Ajouter le nettoyage des demandes refusées anciennes
  v_cleanup_result := cleanup_old_refused_requests();
  v_result := v_result || format(
    'Old refused requests cleaned: %s (DN: %s, QR: %s)\n',
    v_cleanup_result->>'total_deleted',
    v_cleanup_result->>'deleted_delivery_notes',
    v_cleanup_result->>'deleted_quote_requests'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour le job cron pour utiliser la nouvelle fonction
DO $$
BEGIN
  PERFORM cron.unschedule('daily-maintenance');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-maintenance',
  '0 3 * * *', -- 3h du matin au lieu de 2h
  'SELECT run_daily_maintenance_complete();'
);

-- Commentaires
COMMENT ON FUNCTION cleanup_old_refused_requests() IS 
  'Supprime automatiquement les demandes refusées de plus de 5 mois pour maintenir la base de données propre';

COMMENT ON FUNCTION run_daily_maintenance_complete() IS 
  'Maintenance quotidienne complète incluant le nettoyage des demandes refusées anciennes';
