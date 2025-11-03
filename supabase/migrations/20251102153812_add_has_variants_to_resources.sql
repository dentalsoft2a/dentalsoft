/*
  # Add has_variants column to resources

  1. Changes
    - Add `has_variants` boolean column to resources table
    - This indicates whether the resource uses variant-based stock tracking
    - When true, the general stock_quantity is ignored and variants manage stock
    - Add a trigger to automatically update has_variants when variants are added/removed

  2. Notes
    - Resources with variants (shades) don't use the general stock_quantity
    - Stock is tracked individually for each variant
    - This prevents confusion between general stock and variant stock
*/

-- Add has_variants column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'has_variants'
  ) THEN
    ALTER TABLE resources ADD COLUMN has_variants boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Update has_variants based on existing variants
UPDATE resources 
SET has_variants = true
WHERE id IN (
  SELECT DISTINCT resource_id 
  FROM resource_variants 
  WHERE is_active = true
);

-- Create function to update has_variants when variants change
CREATE OR REPLACE FUNCTION update_resource_has_variants()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if resource has any active variants
  UPDATE resources
  SET has_variants = EXISTS (
    SELECT 1 
    FROM resource_variants 
    WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on resource_variants table
DROP TRIGGER IF EXISTS trigger_update_has_variants_on_insert ON resource_variants;
CREATE TRIGGER trigger_update_has_variants_on_insert
  AFTER INSERT ON resource_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_has_variants();

DROP TRIGGER IF EXISTS trigger_update_has_variants_on_update ON resource_variants;
CREATE TRIGGER trigger_update_has_variants_on_update
  AFTER UPDATE ON resource_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_has_variants();

DROP TRIGGER IF EXISTS trigger_update_has_variants_on_delete ON resource_variants;
CREATE TRIGGER trigger_update_has_variants_on_delete
  AFTER DELETE ON resource_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_has_variants();