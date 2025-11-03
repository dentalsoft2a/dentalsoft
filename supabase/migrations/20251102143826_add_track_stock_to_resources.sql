/*
  # Add track_stock column to resources table

  1. Changes
    - Add `track_stock` boolean column to resources table
    - Default value is true (all resources track stock by default)
    - Update existing resources to have track_stock = true

  2. Notes
    - This column indicates whether stock tracking is enabled for this resource
    - When true, the resource will be included in low stock alerts
*/

-- Add track_stock column to resources table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'track_stock'
  ) THEN
    ALTER TABLE resources ADD COLUMN track_stock boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Ensure all existing resources have track_stock set to true
UPDATE resources SET track_stock = true WHERE track_stock IS NULL;