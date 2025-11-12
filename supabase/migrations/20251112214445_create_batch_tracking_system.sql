/*
  # Système de Traçabilité des Numéros de Lot

  ## Description
  Ce système permet de gérer les numéros de lot des matériaux utilisés dans la fabrication
  des prothèses dentaires, en conformité avec les exigences de traçabilité réglementaire.

  ## Nouvelles Tables

  ### `batch_brands`
  Stocke les marques de matériaux (Ivoclar, Miyo, etc.)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key vers auth.users)
  - `name` (text) - Nom de la marque
  - `description` (text, nullable) - Description optionnelle
  - `is_active` (boolean) - Marque active ou non
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `batch_materials`
  Stocke les matériaux spécifiques de chaque marque
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key vers auth.users)
  - `brand_id` (uuid, foreign key vers batch_brands)
  - `name` (text) - Nom du matériau (ex: "Zircone Prime A2")
  - `description` (text, nullable) - Description détaillée
  - `material_type` (text) - Type de matériau (disque, bloc, porcelaine, résine, etc.)
  - `is_favorite` (boolean) - Marqué comme favori pour accès rapide
  - `is_active` (boolean) - Matériau actif ou non
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `batch_numbers`
  Stocke les numéros de lot actuels et historiques
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key vers auth.users)
  - `material_id` (uuid, foreign key vers batch_materials)
  - `batch_number` (text) - Numéro de lot (ex: "1234919")
  - `is_current` (boolean) - Numéro de lot actuellement en cours d'utilisation
  - `started_at` (timestamptz) - Date de début d'utilisation
  - `ended_at` (timestamptz, nullable) - Date de fin d'utilisation
  - `notes` (text, nullable) - Notes optionnelles
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `delivery_note_batches`
  Lie les numéros de lot aux bons de livraison pour la traçabilité
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key vers auth.users)
  - `delivery_note_id` (uuid, foreign key vers delivery_notes)
  - `delivery_note_item_index` (integer) - Index de l'article dans le BL
  - `batch_number_id` (uuid, foreign key vers batch_numbers)
  - `material_id` (uuid, foreign key vers batch_materials)
  - `quantity_used` (numeric, nullable) - Quantité utilisée de ce lot
  - `created_at` (timestamptz)

  ### `resource_batch_link`
  Lie les ressources/variantes existantes aux matériaux de lot
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key vers auth.users)
  - `resource_id` (uuid, nullable, foreign key vers resources)
  - `variant_id` (uuid, nullable, foreign key vers resource_variants)
  - `material_id` (uuid, foreign key vers batch_materials)
  - `is_required` (boolean) - Le numéro de lot est-il obligatoire pour cette ressource?
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies pour authenticated users seulement
  - Chaque utilisateur ne peut accéder qu'à ses propres données
*/

-- Table: batch_brands
CREATE TABLE IF NOT EXISTS batch_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE batch_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch brands"
  ON batch_brands FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batch brands"
  ON batch_brands FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batch brands"
  ON batch_brands FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own batch brands"
  ON batch_brands FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: batch_materials
CREATE TABLE IF NOT EXISTS batch_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES batch_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  material_type text NOT NULL,
  is_favorite boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, name)
);

ALTER TABLE batch_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch materials"
  ON batch_materials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batch materials"
  ON batch_materials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batch materials"
  ON batch_materials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own batch materials"
  ON batch_materials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: batch_numbers
CREATE TABLE IF NOT EXISTS batch_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES batch_materials(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  is_current boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE batch_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch numbers"
  ON batch_numbers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batch numbers"
  ON batch_numbers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batch numbers"
  ON batch_numbers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own batch numbers"
  ON batch_numbers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: delivery_note_batches
CREATE TABLE IF NOT EXISTS delivery_note_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  delivery_note_item_index integer NOT NULL,
  batch_number_id uuid NOT NULL REFERENCES batch_numbers(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES batch_materials(id) ON DELETE CASCADE,
  quantity_used numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_note_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery note batches"
  ON delivery_note_batches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery note batches"
  ON delivery_note_batches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery note batches"
  ON delivery_note_batches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own delivery note batches"
  ON delivery_note_batches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: resource_batch_link
CREATE TABLE IF NOT EXISTS resource_batch_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES resource_variants(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES batch_materials(id) ON DELETE CASCADE,
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (resource_id IS NOT NULL AND variant_id IS NULL) OR
    (resource_id IS NULL AND variant_id IS NOT NULL)
  )
);

ALTER TABLE resource_batch_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resource batch links"
  ON resource_batch_link FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resource batch links"
  ON resource_batch_link FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resource batch links"
  ON resource_batch_link FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resource batch links"
  ON resource_batch_link FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_batch_materials_brand_id ON batch_materials(brand_id);
CREATE INDEX IF NOT EXISTS idx_batch_materials_user_id ON batch_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_materials_is_favorite ON batch_materials(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_batch_numbers_material_id ON batch_numbers(material_id);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_is_current ON batch_numbers(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_delivery_note_batches_delivery_note_id ON delivery_note_batches(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_resource_batch_link_resource_id ON resource_batch_link(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_batch_link_variant_id ON resource_batch_link(variant_id) WHERE variant_id IS NOT NULL;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_batch_brands_updated_at
  BEFORE UPDATE ON batch_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_updated_at();

CREATE TRIGGER update_batch_materials_updated_at
  BEFORE UPDATE ON batch_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_updated_at();

CREATE TRIGGER update_batch_numbers_updated_at
  BEFORE UPDATE ON batch_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_updated_at();

CREATE TRIGGER update_resource_batch_link_updated_at
  BEFORE UPDATE ON resource_batch_link
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_updated_at();

-- Fonction pour marquer automatiquement l'ancien lot comme non-courant quand un nouveau est créé
CREATE OR REPLACE FUNCTION set_batch_number_current()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    -- Marquer tous les autres lots de ce matériau comme non-courants
    UPDATE batch_numbers
    SET is_current = false, ended_at = now()
    WHERE material_id = NEW.material_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_current_batch
  AFTER INSERT OR UPDATE ON batch_numbers
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION set_batch_number_current();