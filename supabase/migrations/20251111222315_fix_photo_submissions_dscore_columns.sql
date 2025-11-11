/*
  # Correction des colonnes DScore manquantes dans photo_submissions

  1. Problème
    - Les colonnes dscore_id et dscore_metadata sont définies dans la migration 20251110190000
    - Mais elles n'existent pas dans la table photo_submissions
    
  2. Solution
    - Ajouter les colonnes dscore_id et dscore_metadata si elles n'existent pas
    - Mettre à jour la contrainte CHECK sur la colonne source pour inclure 'dscore'

  3. Sécurité
    - Utilisation de IF NOT EXISTS pour éviter les erreurs
    - Aucune perte de données
*/

-- Ajouter la colonne dscore_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' 
    AND column_name = 'dscore_id'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN dscore_id text;
  END IF;
END $$;

-- Ajouter la colonne dscore_metadata si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' 
    AND column_name = 'dscore_metadata'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN dscore_metadata jsonb;
  END IF;
END $$;

-- Mettre à jour la contrainte CHECK sur la colonne source
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'photo_submissions'
    AND constraint_name LIKE '%source%check%'
  ) THEN
    ALTER TABLE photo_submissions DROP CONSTRAINT IF EXISTS photo_submissions_source_check;
  END IF;
  
  -- Ajouter la nouvelle contrainte avec 'dscore' inclus
  ALTER TABLE photo_submissions ADD CONSTRAINT photo_submissions_source_check 
    CHECK (source IN ('dentist_app', 'dscore', '3shape'));
END $$;

-- Créer un index pour améliorer les performances des recherches par dscore_id
CREATE INDEX IF NOT EXISTS idx_photo_submissions_dscore_id 
  ON photo_submissions(dscore_id) WHERE dscore_id IS NOT NULL;
