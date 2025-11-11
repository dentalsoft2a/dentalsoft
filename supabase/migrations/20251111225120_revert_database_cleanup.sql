/*
  # Restauration de la base de données avant le nettoyage

  1. Actions de restauration
    - Supprimer les tables DScore créées lors du nettoyage (dscore_credentials, dscore_dentist_mapping, dscore_sync_log)
    - Restaurer la colonne _temp_reload_trigger dans delivery_note_stages si nécessaire
    - Restaurer la table work_stages si elle a été supprimée
    - Supprimer les colonnes DScore ajoutées à photo_submissions (dscore_id, dscore_metadata)
    - Restaurer la contrainte CHECK originale sur photo_submissions.source

  2. Sécurité
    - Toutes les suppressions utilisent IF EXISTS pour éviter les erreurs
    - Préservation des données existantes autant que possible
*/

-- Supprimer les tables DScore créées lors du nettoyage
DROP TABLE IF EXISTS dscore_sync_log CASCADE;
DROP TABLE IF EXISTS dscore_dentist_mapping CASCADE;
DROP TABLE IF EXISTS dscore_credentials CASCADE;

-- Supprimer les colonnes DScore ajoutées à photo_submissions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' 
    AND column_name = 'dscore_id'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN dscore_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' 
    AND column_name = 'dscore_metadata'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN dscore_metadata;
  END IF;
END $$;

-- Restaurer la contrainte CHECK originale sur photo_submissions.source (sans 'dscore')
DO $$
BEGIN
  -- Supprimer la contrainte actuelle
  ALTER TABLE photo_submissions DROP CONSTRAINT IF EXISTS photo_submissions_source_check;
  
  -- Restaurer la contrainte originale
  ALTER TABLE photo_submissions ADD CONSTRAINT photo_submissions_source_check 
    CHECK (source IN ('dentist_app', '3shape'));
END $$;

-- Note: La table work_stages ne peut pas être facilement restaurée sans ses données
-- Note: La colonne _temp_reload_trigger était temporaire et n'a pas besoin d'être restaurée
