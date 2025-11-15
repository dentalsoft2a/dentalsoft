/*
  # Créer le système de ressources prédéfinies

  1. Nouvelle table
    - `predefined_resources`
      - `id` (uuid, primary key)
      - `name` (text) - Nom de la ressource
      - `description` (text) - Description
      - `unit` (text) - Unité
      - `has_variants` (boolean) - Si la ressource a des variantes
      - `is_active` (boolean) - Actif/Inactif
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS on `predefined_resources` table
    - Add policies for all authenticated users to read predefined resources
    - Add policies for super admins to manage predefined resources

  3. Données initiales
    - Insertion des ressources du compte GB DENTAL comme ressources prédéfinies
*/

-- Créer la table des ressources prédéfinies
CREATE TABLE IF NOT EXISTS predefined_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  unit text NOT NULL DEFAULT 'unité',
  has_variants boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE predefined_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent lire les ressources prédéfinies actives
CREATE POLICY "Authenticated users can view active predefined resources"
  ON predefined_resources
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Super admins peuvent tout faire
CREATE POLICY "Super admins can manage predefined resources"
  ON predefined_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Insérer les ressources prédéfinies basées sur GB DENTAL
INSERT INTO predefined_resources (name, description, unit, has_variants) VALUES
  ('Chrome-Cobalt', '', 'unité', false),
  ('Disilicate de lithium', '', 'unité', true),
  ('Disque Zircone', '', 'unité', true),
  ('PMMA mono', '', 'unité', true)
ON CONFLICT DO NOTHING;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_predefined_resources_active ON predefined_resources(is_active);
