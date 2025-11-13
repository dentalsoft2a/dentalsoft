/*
  # Correction sécurité - Partie 5: Activer RLS sur les tables publiques
  
  Active Row Level Security sur les tables publiques qui n'ont pas de protection.
*/

-- Activer RLS sur database_optimization_backup
ALTER TABLE database_optimization_backup ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les super admins peuvent accéder aux backups
CREATE POLICY "Super admins can access backup data"
  ON database_optimization_backup
  FOR ALL
  TO authenticated
  USING ((select is_super_admin()));

-- Activer RLS sur schema_migrations  
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire les migrations (pour tracking)
CREATE POLICY "Anyone can view schema migrations"
  ON schema_migrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique : Seuls les super admins peuvent modifier les migrations
CREATE POLICY "Super admins can manage migrations"
  ON schema_migrations
  FOR ALL
  TO authenticated
  USING ((select is_super_admin()))
  WITH CHECK ((select is_super_admin()));

COMMENT ON TABLE database_optimization_backup IS 
  'Backup table for database optimization - RLS enabled, super admin access only';

COMMENT ON TABLE schema_migrations IS 
  'Schema migration tracking - RLS enabled, read-only for authenticated users';
