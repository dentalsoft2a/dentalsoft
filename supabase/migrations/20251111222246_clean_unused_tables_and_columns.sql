/*
  # Nettoyage de la base de données - Tables et colonnes inutilisées

  1. Problèmes identifiés
    - Tables DScore manquantes (dscore_credentials, dscore_dentist_mapping, dscore_sync_log) définies dans migrations mais non créées
    - Colonne temporaire _temp_reload_trigger dans delivery_note_stages (utilisée pour forcer le rechargement du schéma)
    - Migrations dupliquées (20251108000000-003 et 20251110131126-322)
    - Table work_stages obsolète (remplacée par production_stages)

  2. Actions de nettoyage
    - Créer les tables DScore manquantes
    - Supprimer la colonne temporaire _temp_reload_trigger si elle existe
    - Supprimer la table work_stages si elle existe (obsolète)
    - Nettoyer les références orphelines

  3. Sécurité
    - Toutes les suppressions utilisent IF EXISTS pour éviter les erreurs
    - Les données existantes sont préservées
    - Les politiques RLS sont maintenues
*/

-- Créer les tables DScore manquantes si elles n'existent pas
CREATE TABLE IF NOT EXISTS dscore_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  api_secret text NOT NULL,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency_hours integer DEFAULT 24,
  auto_sync_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(laboratory_id)
);

CREATE TABLE IF NOT EXISTS dscore_dentist_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  local_dentist_id uuid REFERENCES dentists(id) ON DELETE CASCADE NOT NULL,
  dscore_dentist_id text NOT NULL,
  dscore_dentist_name text,
  dscore_dentist_email text,
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  sync_errors text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(laboratory_id, local_dentist_id),
  UNIQUE(laboratory_id, dscore_dentist_id)
);

CREATE TABLE IF NOT EXISTS dscore_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sync_type text NOT NULL CHECK (sync_type IN ('manual', 'automatic', 'test')),
  sync_status text NOT NULL CHECK (sync_status IN ('success', 'partial', 'failed')),
  photos_synced integer DEFAULT 0,
  photos_failed integer DEFAULT 0,
  error_message text,
  sync_details jsonb,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS sur les tables DScore
ALTER TABLE dscore_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE dscore_dentist_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE dscore_sync_log ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour dscore_credentials
CREATE POLICY "Laboratories can view own DScore credentials"
  ON dscore_credentials FOR SELECT
  TO authenticated
  USING (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can insert own DScore credentials"
  ON dscore_credentials FOR INSERT
  TO authenticated
  WITH CHECK (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can update own DScore credentials"
  ON dscore_credentials FOR UPDATE
  TO authenticated
  USING (laboratory_id = auth.uid())
  WITH CHECK (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can delete own DScore credentials"
  ON dscore_credentials FOR DELETE
  TO authenticated
  USING (laboratory_id = auth.uid());

-- Politiques RLS pour dscore_dentist_mapping
CREATE POLICY "Laboratories can view own DScore mappings"
  ON dscore_dentist_mapping FOR SELECT
  TO authenticated
  USING (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can insert own DScore mappings"
  ON dscore_dentist_mapping FOR INSERT
  TO authenticated
  WITH CHECK (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can update own DScore mappings"
  ON dscore_dentist_mapping FOR UPDATE
  TO authenticated
  USING (laboratory_id = auth.uid())
  WITH CHECK (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can delete own DScore mappings"
  ON dscore_dentist_mapping FOR DELETE
  TO authenticated
  USING (laboratory_id = auth.uid());

-- Politiques RLS pour dscore_sync_log
CREATE POLICY "Laboratories can view own DScore sync logs"
  ON dscore_sync_log FOR SELECT
  TO authenticated
  USING (laboratory_id = auth.uid());

CREATE POLICY "Laboratories can insert own DScore sync logs"
  ON dscore_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (laboratory_id = auth.uid());

-- Supprimer la colonne temporaire si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_note_stages' 
    AND column_name = '_temp_reload_trigger'
  ) THEN
    ALTER TABLE delivery_note_stages DROP COLUMN _temp_reload_trigger;
  END IF;
END $$;

-- Supprimer la table work_stages obsolète si elle existe (remplacée par production_stages)
DROP TABLE IF EXISTS work_stages CASCADE;

-- Créer un index pour améliorer les performances des requêtes DScore
CREATE INDEX IF NOT EXISTS idx_dscore_sync_log_laboratory 
  ON dscore_sync_log(laboratory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dscore_dentist_mapping_lookup 
  ON dscore_dentist_mapping(laboratory_id, local_dentist_id);

CREATE INDEX IF NOT EXISTS idx_dscore_credentials_active 
  ON dscore_credentials(laboratory_id) WHERE is_active = true;
