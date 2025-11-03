/*
  # Create Resources Management System

  1. New Tables
    - `resources`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Name of the resource (e.g., "Disque Zircone")
      - `description` (text, nullable)
      - `unit` (text) - Unit of measurement (e.g., "disque", "bloc", "ml")
      - `stock_quantity` (integer) - Current stock of this resource
      - `low_stock_threshold` (integer) - Alert threshold
      - `cost_per_unit` (numeric) - Cost per unit for tracking
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `catalog_item_resources`
      - `id` (uuid, primary key)
      - `catalog_item_id` (uuid, foreign key to catalog_items)
      - `resource_id` (uuid, foreign key to resources)
      - `quantity_needed` (numeric) - How many units of item are made from one resource unit
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own resources

  3. Notes
    - Resources are raw materials (disques, blocs, etc.)
    - Junction table links catalog items to resources with conversion ratios
    - Example: 28 zircone crowns = 1 zircone disc
*/

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'unité',
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  cost_per_unit numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create catalog_item_resources junction table
CREATE TABLE IF NOT EXISTS catalog_item_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity_needed numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(catalog_item_id, resource_id)
);

-- Add check constraints
ALTER TABLE resources ADD CONSTRAINT resources_stock_quantity_check CHECK (stock_quantity >= 0);
ALTER TABLE resources ADD CONSTRAINT resources_low_stock_threshold_check CHECK (low_stock_threshold >= 0);
ALTER TABLE catalog_item_resources ADD CONSTRAINT catalog_item_resources_quantity_needed_check CHECK (quantity_needed > 0);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_item_resources ENABLE ROW LEVEL SECURITY;

-- Resources policies
CREATE POLICY "Users can view own resources"
  ON resources FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own resources"
  ON resources FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own resources"
  ON resources FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Catalog item resources policies
CREATE POLICY "Users can view own catalog item resources"
  ON catalog_item_resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own catalog item resources"
  ON catalog_item_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own catalog item resources"
  ON catalog_item_resources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own catalog item resources"
  ON catalog_item_resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_catalog_item ON catalog_item_resources(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_resource ON catalog_item_resources(resource_id);

-- Add updated_at trigger for resources
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();
