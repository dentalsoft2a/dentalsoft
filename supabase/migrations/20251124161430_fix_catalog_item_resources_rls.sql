/*
  # Fix catalog_item_resources RLS policies

  1. Security
    - Enable RLS on catalog_item_resources table
    - Add policies for authenticated users to manage their catalog item resources
    - Users can only manage resources linked to their own catalog items

  2. Changes
    - Add SELECT policy for users to view their catalog item resources
    - Add INSERT policy for users to add resources to their catalog items
    - Add UPDATE policy for users to update their catalog item resources
    - Add DELETE policy for users to remove resources from their catalog items
*/

-- Enable RLS (should already be enabled but let's be sure)
ALTER TABLE catalog_item_resources ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view resources linked to their catalog items
CREATE POLICY "Users can view their catalog item resources"
  ON catalog_item_resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

-- INSERT: Users can add resources to their catalog items
CREATE POLICY "Users can add resources to their catalog items"
  ON catalog_item_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update resources linked to their catalog items
CREATE POLICY "Users can update their catalog item resources"
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

-- DELETE: Users can remove resources from their catalog items
CREATE POLICY "Users can delete their catalog item resources"
  ON catalog_item_resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_catalog_item_id 
  ON catalog_item_resources(catalog_item_id);

CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_resource_id 
  ON catalog_item_resources(resource_id);
