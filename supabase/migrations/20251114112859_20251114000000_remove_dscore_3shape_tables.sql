/*
  # Suppression des intégrations DS-Core et 3Shape

  1. Tables supprimées
    - `dscore_credentials` - Credentials DS-Core
    - `dscore_dentist_mappings` - Mappings dentistes DS-Core
    - `dscore_sync_logs` - Logs de synchronisation DS-Core
    - `threeshape_credentials` - Credentials 3Shape
    - `threeshape_dentist_mappings` - Mappings dentistes 3Shape
    - `threeshape_sync_logs` - Logs de synchronisation 3Shape

  2. Colonnes supprimées
    - `photo_submissions.dscore_case_id`
    - `photo_submissions.dscore_photo_id`
    - `photo_submissions.dscore_sync_status`
    - `photo_submissions.dscore_last_sync`
    - `photo_submissions.threeshape_case_id`
    - `photo_submissions.threeshape_sync_status`
    - `photo_submissions.threeshape_last_sync`

  3. Note
    - Les données sont supprimées définitivement
    - Cette action est irréversible
*/

-- Supprimer les tables DS-Core
DROP TABLE IF EXISTS dscore_sync_logs CASCADE;
DROP TABLE IF EXISTS dscore_dentist_mappings CASCADE;
DROP TABLE IF EXISTS dscore_credentials CASCADE;

-- Supprimer les tables 3Shape
DROP TABLE IF EXISTS threeshape_sync_logs CASCADE;
DROP TABLE IF EXISTS threeshape_dentist_mappings CASCADE;
DROP TABLE IF EXISTS threeshape_credentials CASCADE;

-- Supprimer les colonnes DS-Core de photo_submissions si elles existent
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'dscore_case_id'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN dscore_case_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'dscore_photo_id'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN dscore_photo_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'dscore_sync_status'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN dscore_sync_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'dscore_last_sync'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN dscore_last_sync;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'threeshape_case_id'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN threeshape_case_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'threeshape_sync_status'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN threeshape_sync_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'threeshape_last_sync'
  ) THEN
    ALTER TABLE photo_submissions DROP COLUMN threeshape_last_sync;
  END IF;
END $$;
