/*
  # Restauration du système de gestion de production

  1. Nouvelle Table
    - `production_stages` - Étapes de production personnalisables
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `name` (text, nom de l'étape)
      - `description` (text)
      - `order_index` (integer, ordre d'affichage)
      - `color` (text, code couleur)
      - `requires_approval` (boolean, nécessite validation)
      - `created_at` (timestamptz)

  2. Sécurité
    - Activer RLS sur production_stages
    - Politiques pour les utilisateurs (propriétaires des étapes)
    - Support pour les employés avec permissions
*/

-- Créer la table production_stages
CREATE TABLE IF NOT EXISTS production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3B82F6',
  requires_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS sur production_stages
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour production_stages
CREATE POLICY "Les utilisateurs peuvent voir leurs propres étapes"
  ON production_stages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs propres étapes"
  ON production_stages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres étapes"
  ON production_stages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres étapes"
  ON production_stages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour les employés (peuvent voir les étapes de leur laboratoire)
CREATE POLICY "Les employés peuvent voir les étapes de leur laboratoire"
  ON production_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
      AND laboratory_employees.laboratory_profile_id = production_stages.user_id
    )
  );

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_production_stages_user_id ON production_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_production_stages_order ON production_stages(user_id, order_index);
