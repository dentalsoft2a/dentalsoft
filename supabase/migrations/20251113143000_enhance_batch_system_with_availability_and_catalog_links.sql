/*
  # Amélioration du système de traçabilité des lots

  ## Description
  Cette migration améliore le système de gestion des lots en ajoutant:
  - Le statut de disponibilité pour les numéros de lot
  - La liaison entre les lots et les articles du catalogue
  - Des index pour optimiser les requêtes de filtrage

  ## Nouvelles fonctionnalités

  ### 1. Champ is_available dans batch_numbers
  Permet de marquer un lot comme disponible ou non disponible
  - Les lots non disponibles ne sont plus proposés dans les bons de livraison
  - L'historique est conservé pour la traçabilité

  ### 2. Table catalog_item_batch_link
  Lie les articles du catalogue aux matériaux de lot
  - Permet de définir quels matériaux peuvent être utilisés pour chaque article
  - Configure si le numéro de lot est obligatoire ou optionnel
  - Facilite le filtrage automatique des lots disponibles

  ## Tables modifiées
  - `batch_numbers`: Ajout du champ `is_available`

  ## Nouvelles tables
  - `catalog_item_batch_link`: Liaison articles du catalogue <-> matériaux de lot

  ## Sécurité
  - RLS activé sur toutes les nouvelles tables
  - Policies pour authenticated users seulement
  - Chaque utilisateur ne peut accéder qu'à ses propres données
*/

-- Ajouter le champ is_available à batch_numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_numbers' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE batch_numbers ADD COLUMN is_available boolean DEFAULT true;
  END IF;
END $$;

-- Table: catalog_item_batch_link
CREATE TABLE IF NOT EXISTS catalog_item_batch_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES batch_materials(id) ON DELETE CASCADE,
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(catalog_item_id, material_id)
);

ALTER TABLE catalog_item_batch_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catalog item batch links"
  ON catalog_item_batch_link FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catalog item batch links"
  ON catalog_item_batch_link FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catalog item batch links"
  ON catalog_item_batch_link FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own catalog item batch links"
  ON catalog_item_batch_link FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_batch_numbers_is_available ON batch_numbers(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_catalog_item_batch_link_catalog_item ON catalog_item_batch_link(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_batch_link_material ON catalog_item_batch_link(material_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_batch_link_user_id ON catalog_item_batch_link(user_id);

-- Trigger pour updated_at sur catalog_item_batch_link
CREATE TRIGGER update_catalog_item_batch_link_updated_at
  BEFORE UPDATE ON catalog_item_batch_link
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_updated_at();

-- Fonction pour obtenir les lots disponibles pour un article du catalogue
CREATE OR REPLACE FUNCTION get_available_batches_for_catalog_item(
  p_catalog_item_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  batch_number_id uuid,
  batch_number text,
  material_id uuid,
  material_name text,
  brand_name text,
  is_current boolean,
  is_required boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    bn.id as batch_number_id,
    bn.batch_number,
    bm.id as material_id,
    bm.name as material_name,
    bb.name as brand_name,
    bn.is_current,
    cibl.is_required
  FROM batch_numbers bn
  INNER JOIN batch_materials bm ON bn.material_id = bm.id
  INNER JOIN batch_brands bb ON bm.brand_id = bb.id
  INNER JOIN catalog_item_batch_link cibl ON bm.id = cibl.material_id
  WHERE cibl.catalog_item_id = p_catalog_item_id
    AND bn.user_id = p_user_id
    AND bn.is_available = true
    AND bm.is_active = true
  ORDER BY bn.is_current DESC, bn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les lots disponibles pour une ressource
CREATE OR REPLACE FUNCTION get_available_batches_for_resource(
  p_resource_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  batch_number_id uuid,
  batch_number text,
  material_id uuid,
  material_name text,
  brand_name text,
  is_current boolean,
  is_required boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    bn.id as batch_number_id,
    bn.batch_number,
    bm.id as material_id,
    bm.name as material_name,
    bb.name as brand_name,
    bn.is_current,
    rbl.is_required
  FROM batch_numbers bn
  INNER JOIN batch_materials bm ON bn.material_id = bm.id
  INNER JOIN batch_brands bb ON bm.brand_id = bb.id
  INNER JOIN resource_batch_link rbl ON bm.id = rbl.material_id
  WHERE rbl.resource_id = p_resource_id
    AND bn.user_id = p_user_id
    AND bn.is_available = true
    AND bm.is_active = true
  ORDER BY bn.is_current DESC, bn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les lots disponibles pour une variante de ressource
CREATE OR REPLACE FUNCTION get_available_batches_for_variant(
  p_variant_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  batch_number_id uuid,
  batch_number text,
  material_id uuid,
  material_name text,
  brand_name text,
  is_current boolean,
  is_required boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    bn.id as batch_number_id,
    bn.batch_number,
    bm.id as material_id,
    bm.name as material_name,
    bb.name as brand_name,
    bn.is_current,
    rbl.is_required
  FROM batch_numbers bn
  INNER JOIN batch_materials bm ON bn.material_id = bm.id
  INNER JOIN batch_brands bb ON bm.brand_id = bb.id
  INNER JOIN resource_batch_link rbl ON bm.id = rbl.material_id
  WHERE rbl.variant_id = p_variant_id
    AND bn.user_id = p_user_id
    AND bn.is_available = true
    AND bm.is_active = true
  ORDER BY bn.is_current DESC, bn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire explicatif
COMMENT ON TABLE catalog_item_batch_link IS 'Lie les articles du catalogue aux matériaux de lot pour filtrer automatiquement les lots disponibles lors de la création de bons de livraison';
COMMENT ON COLUMN batch_numbers.is_available IS 'Indique si le lot est disponible pour utilisation. Les lots indisponibles ne sont plus proposés dans les bons de livraison';
COMMENT ON FUNCTION get_available_batches_for_catalog_item IS 'Retourne tous les lots disponibles et actifs pour un article du catalogue donné';
COMMENT ON FUNCTION get_available_batches_for_resource IS 'Retourne tous les lots disponibles et actifs pour une ressource donnée';
COMMENT ON FUNCTION get_available_batches_for_variant IS 'Retourne tous les lots disponibles et actifs pour une variante de ressource donnée';
