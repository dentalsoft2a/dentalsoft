/*
  # Add Stock Management to Catalog Items

  1. Changes
    - Add `stock_quantity` column to track current stock level
    - Add `low_stock_threshold` column to set alert threshold
    - Add `track_stock` column to enable/disable stock tracking per item
    - Add `stock_unit` column to specify unit of measurement for stock

  2. Notes
    - Stock tracking is optional per item (track_stock flag)
    - Low stock threshold helps identify items that need reordering
    - Default values ensure existing items continue to work
*/

DO $$
BEGIN
  -- Add stock_quantity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_items' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE catalog_items ADD COLUMN stock_quantity integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add low_stock_threshold column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_items' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE catalog_items ADD COLUMN low_stock_threshold integer DEFAULT 10 NOT NULL;
  END IF;

  -- Add track_stock column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_items' AND column_name = 'track_stock'
  ) THEN
    ALTER TABLE catalog_items ADD COLUMN track_stock boolean DEFAULT false NOT NULL;
  END IF;

  -- Add stock_unit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_items' AND column_name = 'stock_unit'
  ) THEN
    ALTER TABLE catalog_items ADD COLUMN stock_unit text DEFAULT 'unité';
  END IF;
END $$;

-- Add check constraint to ensure stock_quantity is not negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catalog_items_stock_quantity_check'
  ) THEN
    ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_stock_quantity_check CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- Add check constraint to ensure low_stock_threshold is not negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catalog_items_low_stock_threshold_check'
  ) THEN
    ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_low_stock_threshold_check CHECK (low_stock_threshold >= 0);
  END IF;
END $$;
