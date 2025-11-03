/*
  # Create resource variants system for shade management

  1. New Tables
    - `resource_variants`
      - `id` (uuid, primary key)
      - `resource_id` (uuid, foreign key to resources)
      - `user_id` (uuid, foreign key to auth.users)
      - `variant_name` (text) - e.g., "A1", "A2", "B1", etc.
      - `stock_quantity` (numeric) - stock for this specific variant
      - `is_active` (boolean) - whether this variant is available
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to stock_movements
    - Add `resource_variant_id` (uuid, nullable) - to track which variant was used
    
  3. Security
    - Enable RLS on `resource_variants` table
    - Add policies for authenticated users to manage their variants
    - Update stock_movements policies to handle variants

  4. Notes
    - Resources can have multiple variants (shades/colors)
    - Each variant has its own stock tracking
    - Stock movements can be linked to specific variants
    - When a resource has variants, stock is tracked per variant
*/

-- Create resource_variants table
CREATE TABLE IF NOT EXISTS resource_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  stock_quantity numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_resource_variant UNIQUE (resource_id, variant_name)
);

-- Add resource_variant_id to stock_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'resource_variant_id'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN resource_variant_id uuid REFERENCES resource_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on resource_variants
ALTER TABLE resource_variants ENABLE ROW LEVEL SECURITY;

-- Policies for resource_variants
CREATE POLICY "Users can view own resource variants"
  ON resource_variants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resource variants"
  ON resource_variants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resource variants"
  ON resource_variants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resource variants"
  ON resource_variants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_variants_resource_id ON resource_variants(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_variants_user_id ON resource_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_resource_variant_id ON stock_movements(resource_variant_id);