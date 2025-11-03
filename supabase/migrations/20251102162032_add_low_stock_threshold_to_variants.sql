/*
  # Add low stock threshold to resource variants

  1. Changes
    - Add `low_stock_threshold` column to `resource_variants` table
    - Default value set to 5 for existing variants
    - Allows independent stock alert thresholds for each variant
  
  2. Security
    - No RLS changes needed (inherits from existing policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_variants' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE resource_variants 
    ADD COLUMN low_stock_threshold integer DEFAULT 5 NOT NULL;
  END IF;
END $$;
