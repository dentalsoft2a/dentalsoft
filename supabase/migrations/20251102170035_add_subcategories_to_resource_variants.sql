/*
  # Add subcategories system to resource variants

  1. Changes
    - Add `subcategory` field to resource_variants table to group variants
    - Each subcategory can have its own stock tracking
    - Example: "Disque Zircone" resource with subcategories "16mm", "20mm"
              and each has variants "A1", "A2", etc.

  2. Structure
    - subcategory: Text field for grouping variants (e.g., "16mm", "20mm")
    - Variants with same subcategory belong to same group
    - Each variant still has its own stock_quantity and low_stock_threshold
  
  3. Notes
    - Existing variants without subcategory will work normally
    - This adds an optional organizational layer
*/

-- Add subcategory column to resource_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_variants' AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE resource_variants ADD COLUMN subcategory text DEFAULT '';
  END IF;
END $$;

-- Update description comment
COMMENT ON COLUMN resource_variants.subcategory IS 'Optional subcategory for grouping variants (e.g., "16mm", "20mm" for different sizes)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_resource_variants_subcategory ON resource_variants(resource_id, subcategory) WHERE is_active = true;