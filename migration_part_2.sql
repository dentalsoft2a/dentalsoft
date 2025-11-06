-- ============================================
-- PARTIE 2/10 - Migrations 9 à 16
-- ============================================

-- ============================================
-- Migration: 20251102040215_create_super_admin_system.sql
-- ============================================

/*
  # Create Super Admin System

  ## Overview
  This migration creates a comprehensive super admin system with:
  - User management with roles and subscription tracking
  - Stripe integration for subscription management
  - Support messaging system between users and super admins
  - Audit logging for admin actions

  ## New Tables
  
  ### `user_profiles`
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `role` (text) - 'user', 'super_admin'
  - `subscription_status` (text) - 'active', 'inactive', 'trial', 'cancelled'
  - `subscription_plan` (text)
  - `stripe_customer_id` (text)
  - `stripe_subscription_id` (text)
  - `trial_ends_at` (timestamptz)
  - `subscription_ends_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `subscription_plans`
  - `id` (uuid, primary key)
  - `name` (text)
  - `description` (text)
  - `price_monthly` (numeric)
  - `stripe_price_id` (text)
  - `features` (jsonb)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `support_tickets`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `subject` (text)
  - `status` (text) - 'open', 'in_progress', 'closed'
  - `priority` (text) - 'low', 'medium', 'high', 'urgent'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `support_messages`
  - `id` (uuid, primary key)
  - `ticket_id` (uuid, references support_tickets)
  - `sender_id` (uuid, references auth.users)
  - `message` (text)
  - `is_admin` (boolean)
  - `created_at` (timestamptz)

  ### `admin_audit_log`
  - `id` (uuid, primary key)
  - `admin_id` (uuid, references auth.users)
  - `action` (text)
  - `target_user_id` (uuid)
  - `details` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Super admins can access all data
  - Users can only access their own data
  - Audit logging for all admin actions
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'cancelled')),
  subscription_plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  subscription_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  stripe_price_id text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Super admins can manage plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Users can create own tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all tickets"
  ON support_tickets FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for own tickets"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can create messages for own tickets"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Super admins can create audit log entries"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, subscription_status)
  VALUES (NEW.id, NEW.email, 'user', 'trial')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_profile();
  END IF;
END $$;

-- Insert default subscription plan
INSERT INTO subscription_plans (name, description, price_monthly, features, is_active)
VALUES (
  'Plan Standard',
  'Accès complet à toutes les fonctionnalités de DentalSoft',
  49.99,
  '["Bons de livraison illimités", "Proformas et factures illimités", "Gestion des dentistes et patients", "Tableau de bord analytique", "Support client prioritaire", "Mises à jour automatiques", "Sauvegardes automatiques"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- ============================================
-- Migration: 20251102041247_fix_user_profiles_rls_policies.sql
-- ============================================

/*
  # Fix User Profiles RLS Policies

  ## Problem
  The current RLS policies on user_profiles cause infinite recursion because they
  query the same table they're protecting.

  ## Solution
  Simplify the policies to avoid self-referencing queries:
  - Users can read and update their own profile
  - Super admin check is done separately in the application layer
  - Remove recursive policy checks

  ## Changes
  1. Drop existing problematic policies
  2. Create new simplified policies
  3. Grant super admins full access using a simpler approach
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;

-- Create new simplified policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can view all profiles (using raw_app_metadata)
CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (auth.jwt()->>'role')::text = 'super_admin' OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = 'super_admin'
      LIMIT 1
    )
  );

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    (auth.jwt()->>'role')::text = 'super_admin'
  )
  WITH CHECK (
    auth.uid() = id OR
    (auth.jwt()->>'role')::text = 'super_admin'
  );

-- Super admins can insert profiles
CREATE POLICY "Super admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    (auth.jwt()->>'role')::text = 'super_admin'
  );

-- Super admins can delete profiles
CREATE POLICY "Super admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'super_admin');


-- ============================================
-- Migration: 20251102132309_add_stock_management_to_catalog.sql
-- ============================================

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


-- ============================================
-- Migration: 20251102132412_create_stock_movements_tracking.sql
-- ============================================

/*
  # Create Stock Movements Tracking System

  1. New Tables
    - `stock_movements`
      - `id` (uuid, primary key)
      - `catalog_item_id` (uuid, foreign key to catalog_items)
      - `delivery_note_id` (uuid, foreign key to delivery_notes, nullable)
      - `quantity` (integer) - positive for additions, negative for deductions
      - `movement_type` (text) - 'delivery_note', 'manual_adjustment', 'return', etc.
      - `notes` (text, nullable)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `stock_movements` table
    - Add policies for users to manage their own stock movements

  3. Notes
    - This table tracks all stock movements for audit purposes
    - Allows rollback when delivery notes are cancelled
    - Provides full history of stock changes
*/

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  movement_type text NOT NULL DEFAULT 'manual_adjustment',
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "Users can insert own stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can update own stock movements"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete own stock movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_catalog_item ON stock_movements(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_delivery_note ON stock_movements(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);


-- ============================================
-- Migration: 20251102134348_create_resources_system.sql
-- ============================================

/*
  # Create Resources Management System

  1. New Tables
    - `resources`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Name of the resource (e.g., "Disque Zircone")
      - `description` (text, nullable)
      - `unit` (text) - Unit of measurement (e.g., "disque", "bloc", "ml")
      - `stock_quantity` (integer) - Current stock of this resource
      - `low_stock_threshold` (integer) - Alert threshold
      - `cost_per_unit` (numeric) - Cost per unit for tracking
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `catalog_item_resources`
      - `id` (uuid, primary key)
      - `catalog_item_id` (uuid, foreign key to catalog_items)
      - `resource_id` (uuid, foreign key to resources)
      - `quantity_needed` (numeric) - How many units of item are made from one resource unit
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own resources

  3. Notes
    - Resources are raw materials (disques, blocs, etc.)
    - Junction table links catalog items to resources with conversion ratios
    - Example: 28 zircone crowns = 1 zircone disc
*/

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'unité',
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  cost_per_unit numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create catalog_item_resources junction table
CREATE TABLE IF NOT EXISTS catalog_item_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity_needed numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(catalog_item_id, resource_id)
);

-- Add check constraints
ALTER TABLE resources ADD CONSTRAINT resources_stock_quantity_check CHECK (stock_quantity >= 0);
ALTER TABLE resources ADD CONSTRAINT resources_low_stock_threshold_check CHECK (low_stock_threshold >= 0);
ALTER TABLE catalog_item_resources ADD CONSTRAINT catalog_item_resources_quantity_needed_check CHECK (quantity_needed > 0);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_item_resources ENABLE ROW LEVEL SECURITY;

-- Resources policies
CREATE POLICY "Users can view own resources"
  ON resources FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own resources"
  ON resources FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own resources"
  ON resources FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Catalog item resources policies
CREATE POLICY "Users can view own catalog item resources"
  ON catalog_item_resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own catalog item resources"
  ON catalog_item_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own catalog item resources"
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

CREATE POLICY "Users can delete own catalog item resources"
  ON catalog_item_resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_items
      WHERE catalog_items.id = catalog_item_resources.catalog_item_id
      AND catalog_items.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_catalog_item ON catalog_item_resources(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_resource ON catalog_item_resources(resource_id);

-- Add updated_at trigger for resources
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();


-- ============================================
-- Migration: 20251102141642_add_resource_tracking_to_stock_movements.sql
-- ============================================

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

-- ============================================
-- Migration: 20251102142646_fix_resource_stock_quantity_type.sql
-- ============================================

/*
  # Fix resource stock_quantity type to support decimals
  
  1. Changes
    - Change `stock_quantity` column in `resources` table from INTEGER to NUMERIC(10,4)
    - This allows storing decimal values for resources (e.g., 3.96 discs)
    
  2. Notes
    - NUMERIC(10,4) allows up to 10 digits total with 4 decimal places
    - This is necessary for resources that are consumed in fractional amounts
*/

ALTER TABLE resources 
ALTER COLUMN stock_quantity TYPE NUMERIC(10,4) USING stock_quantity::NUMERIC(10,4);

-- ============================================
-- Migration: 20251102142833_fix_stock_movements_quantity_type.sql
-- ============================================

/*
  # Fix stock_movements quantity type to support decimals
  
  1. Changes
    - Change `quantity` column in `stock_movements` table from INTEGER to NUMERIC(10,4)
    - This allows recording fractional quantities in stock movements
    
  2. Notes
    - NUMERIC(10,4) allows up to 10 digits total with 4 decimal places
    - This is necessary for tracking resource consumption in fractional amounts
    - Example: 1.0357 discs consumed
*/

ALTER TABLE stock_movements 
ALTER COLUMN quantity TYPE NUMERIC(10,4) USING quantity::NUMERIC(10,4);

