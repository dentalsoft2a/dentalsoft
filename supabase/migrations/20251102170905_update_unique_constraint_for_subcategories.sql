/*
  # Update unique constraint for resource variants with subcategories

  1. Changes
    - Drop the old unique constraint on (resource_id, variant_name)
    - Create new unique constraint on (resource_id, subcategory, variant_name)
    
  2. Purpose
    - Allow same variant name in different subcategories
    - Example: "A1" can exist in both "16mm" and "20mm" subcategories
    - But prevent duplicate variants within the same subcategory
  
  3. Notes
    - This enables the 3-level hierarchy: Resource → Subcategory → Variant
*/

-- Drop the old unique constraint
ALTER TABLE resource_variants DROP CONSTRAINT IF EXISTS unique_resource_variant;

-- Create new unique constraint including subcategory
ALTER TABLE resource_variants 
ADD CONSTRAINT unique_resource_variant 
UNIQUE (resource_id, subcategory, variant_name);