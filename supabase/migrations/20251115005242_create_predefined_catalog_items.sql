/*
  # Créer le système d'articles de catalogue prédéfinis

  1. Nouvelle table
    - `predefined_catalog_items`
      - `id` (uuid, primary key)
      - `name` (text) - Nom de l'article
      - `description` (text) - Description
      - `category` (text) - Catégorie
      - `default_unit` (text) - Unité par défaut
      - `is_active` (boolean) - Actif/Inactif
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS on `predefined_catalog_items` table
    - Add policies for all authenticated users to read predefined items
    - Add policies for super admins to manage predefined items

  3. Données initiales
    - Insertion des 37 articles du compte GB DENTAL comme articles prédéfinis
*/

-- Créer la table des articles prédéfinis
CREATE TABLE IF NOT EXISTS predefined_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  default_unit text NOT NULL DEFAULT 'unité',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE predefined_catalog_items ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent lire les articles prédéfinis actifs
CREATE POLICY "Authenticated users can view active predefined items"
  ON predefined_catalog_items
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Super admins peuvent tout faire
CREATE POLICY "Super admins can manage predefined items"
  ON predefined_catalog_items
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

-- Insérer les articles prédéfinis basés sur GB DENTAL
INSERT INTO predefined_catalog_items (name, description, category, default_unit) VALUES
  ('Ailette EMAX', '', 'EMAX', 'unité'),
  ('Ailette Zircone', '', 'Zircone', 'unité'),
  ('Boite Gouttière', '', 'Gouttière', 'unité'),
  ('CCM', '', 'Céramique', 'unité'),
  ('CCM sous châssis', '', 'Céramique', 'unité'),
  ('CCM sur implant', '', 'Implantologie', 'unité'),
  ('Clavette', '', 'Métal', 'unité'),
  ('Clef en plâtre passivité', '', 'Implantologie', 'unité'),
  ('Collage Ti-base', '', 'Implantologie', 'unité'),
  ('Couronne Coulée', '', 'Métal', 'unité'),
  ('EMAX Full', '', 'EMAX', 'unité'),
  ('EMAX INLAY/ONLAY', '', 'EMAX', 'unité'),
  ('EMAX Stratifiée', '', 'EMAX', 'unité'),
  ('Empreintes Numériques haut & bas', '', 'Empreintes Numériques', 'unité'),
  ('Fraisage (par dent)', '', 'Divers', 'unité'),
  ('Full Zircone monolithique', '', 'Zircone', 'unité'),
  ('Full Zircone multi-couches', '', 'Zircone', 'unité'),
  ('Full Zircone multilayer', '', 'Zircone', 'unité'),
  ('Full Zircone mutli-couches (implant)', '', 'Implantologie', 'unité'),
  ('Gouttière de blanchiment', '', 'Gouttière', 'unité'),
  ('Gouttière de bruxisme', '', 'Gouttière', 'unité'),
  ('Gouttière de contention', '', 'Gouttière', 'unité'),
  ('Inlay / Onlay Composite', '', 'Composite', 'unité'),
  ('Inlay Core céramisé', '', 'Métal', 'unité'),
  ('Inlay Core direct', '', 'Métal', 'unité'),
  ('Inlay Core indirect', '', 'Métal', 'unité'),
  ('Inlay/Onlay Zircone', '', 'Zircone', 'unité'),
  ('Modèle d''études (plâtre)', '', 'Divers', 'unité'),
  ('Mordu numérique haut & bas', '', 'Empreintes Numériques', 'unité'),
  ('P.E.I (implant)', '', 'Implantologie', 'unité'),
  ('Provisoire PMMA Mono', '', 'Provisoire', 'unité'),
  ('Provisoire PMMA Multi', '', 'Provisoire', 'unité'),
  ('WAX-UP cire', '', 'Divers', 'unité'),
  ('WAX-UP Numérique', '', 'Divers', 'unité'),
  ('Zircone Cut-Back', '', 'Zircone', 'unité'),
  ('Zircone Cut-Back (implant)', '', 'Implantologie', 'unité'),
  ('Zircone Stratifiée', '', 'Zircone', 'unité'),
  ('Zircone stratifiées (implant)', '', 'Implantologie', 'unité')
ON CONFLICT DO NOTHING;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_predefined_catalog_items_category ON predefined_catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_predefined_catalog_items_active ON predefined_catalog_items(is_active);
