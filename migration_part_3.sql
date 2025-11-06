-- ============================================
-- PARTIE 3/10 - Migrations 17 à 24
-- ============================================

-- ============================================
-- Migration: 20251102143826_add_track_stock_to_resources.sql
-- ============================================

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

-- ============================================
-- Migration: 20251102152620_create_resource_variants_system.sql
-- ============================================

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

-- ============================================
-- Migration: 20251102153812_add_has_variants_to_resources.sql
-- ============================================

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

-- ============================================
-- Migration: 20251102162032_add_low_stock_threshold_to_variants.sql
-- ============================================

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


-- ============================================
-- Migration: 20251102170035_add_subcategories_to_resource_variants.sql
-- ============================================

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

-- ============================================
-- Migration: 20251102170905_update_unique_constraint_for_subcategories.sql
-- ============================================

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

-- ============================================
-- Migration: 20251102175511_create_access_codes_system.sql
-- ============================================

/*
  # Create Access Codes System

  1. New Tables
    - `access_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - The access code
      - `duration_days` (integer) - Duration in days (15, 30, 90, 365)
      - `is_used` (boolean) - Whether the code has been used
      - `used_by` (uuid, nullable) - User who used the code
      - `used_at` (timestamptz, nullable) - When the code was used
      - `created_by` (uuid) - Super admin who created it
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz, nullable) - Code expiration date
  
  2. Changes to user_profiles
    - Add `subscription_start_date` (timestamptz, nullable)
    - Add `subscription_end_date` (timestamptz, nullable)
    - Add `subscription_status` (text) - 'trial', 'active', 'expired'
    - Add `trial_used` (boolean) - Whether user has used their free trial
  
  3. Security
    - Enable RLS on `access_codes` table
    - Only super admins can create codes
    - All authenticated users can view and use available codes
    - Users can view their subscription status

  4. Notes
    - New users automatically get 30 days free trial
    - Access codes can have custom durations
    - Codes can expire if not used
*/

-- Create access_codes table
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  duration_days integer NOT NULL,
  is_used boolean DEFAULT false,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT valid_duration CHECK (duration_days > 0)
);

-- Add subscription fields to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_end_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'trial';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'trial_used'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN trial_used boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything with access codes
CREATE POLICY "Super admins can manage access codes"
  ON access_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Authenticated users can view available codes (not used, not expired)
CREATE POLICY "Users can view available codes"
  ON access_codes FOR SELECT
  TO authenticated
  USING (
    is_used = false 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Users can update codes when redeeming them
CREATE POLICY "Users can redeem codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    is_used = false 
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    is_used = true 
    AND used_by = auth.uid()
  );

-- Function to auto-assign trial to new users
CREATE OR REPLACE FUNCTION assign_trial_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Give 30 days free trial to new users
  NEW.subscription_start_date := now();
  NEW.subscription_end_date := now() + interval '30 days';
  NEW.subscription_status := 'trial';
  NEW.trial_used := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign trial on user creation
DROP TRIGGER IF EXISTS assign_trial_on_signup ON user_profiles;
CREATE TRIGGER assign_trial_on_signup
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_trial_to_new_user();

-- Function to update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET subscription_status = 
    CASE 
      WHEN subscription_end_date IS NULL THEN 'expired'
      WHEN subscription_end_date > now() THEN 
        CASE 
          WHEN trial_used = true AND subscription_start_date >= (now() - interval '30 days') THEN 'trial'
          ELSE 'active'
        END
      ELSE 'expired'
    END
  WHERE subscription_end_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_is_used ON access_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

-- ============================================
-- Migration: 20251102180100_link_profiles_and_user_profiles.sql
-- ============================================

/*
  # Link profiles and user_profiles tables

  1. Changes
    - Create trigger to automatically create user_profiles entry when profiles is created
    - Ensure new users get their 30-day trial automatically
  
  2. Notes
    - When a profile is created (during signup), a user_profile is also created
    - The trigger from previous migration handles trial assignment
    - This ensures seamless integration between authentication and subscription systems
*/

-- Function to create user_profile when profile is created
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user_profile entry with trial
  INSERT INTO user_profiles (
    id,
    role,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    trial_used
  ) VALUES (
    NEW.id,
    'user',
    'trial',
    now(),
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user_profile when profile is created
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Ensure existing profiles have user_profiles
INSERT INTO user_profiles (
  id,
  role,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  trial_used
)
SELECT 
  p.id,
  'user',
  'trial',
  now(),
  now() + interval '30 days',
  true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = p.id
)
ON CONFLICT (id) DO NOTHING;

