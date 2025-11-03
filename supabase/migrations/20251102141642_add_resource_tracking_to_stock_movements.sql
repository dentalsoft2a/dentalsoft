/*
  # Add resource tracking to stock_movements table

  1. Changes
    - Add `resource_id` column to track resource movements
    - Add `reference_type` column to identify the type of reference (delivery_note, adjustment, etc.)
    - Add `reference_id` column to store the reference ID
    - Add `user_id` column for security
    - Make `catalog_item_id` nullable since movements can be for resources OR catalog items
    - Add check constraint to ensure either catalog_item_id or resource_id is set
    
  2. Security
    - Add RLS policies for resource movements
*/

-- Make catalog_item_id nullable
ALTER TABLE stock_movements 
  ALTER COLUMN catalog_item_id DROP NOT NULL;

-- Add new columns for resource tracking
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add check constraint to ensure either catalog_item_id or resource_id is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_item_or_resource_check'
  ) THEN
    ALTER TABLE stock_movements
      ADD CONSTRAINT stock_movements_item_or_resource_check
      CHECK (
        (catalog_item_id IS NOT NULL AND resource_id IS NULL) OR
        (catalog_item_id IS NULL AND resource_id IS NOT NULL)
      );
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_resource_id ON stock_movements(resource_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);

-- Update RLS policies for resource movements
DROP POLICY IF EXISTS "Users can view own stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Users can create own stock movements" ON stock_movements;

CREATE POLICY "Users can view own stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can create own stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() OR
    user_id = auth.uid()
  );