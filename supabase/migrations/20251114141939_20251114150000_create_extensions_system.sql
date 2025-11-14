/*
  # Create Extensions System

  This migration creates a complete paid extensions system for the application.

  1. New Tables
    - `extensions`
      - `id` (uuid, primary key)
      - `name` (text) - Extension name
      - `description` (text) - Extension description
      - `monthly_price` (decimal) - Monthly subscription price
      - `is_active` (boolean) - Whether the extension is available for subscription
      - `icon` (text) - Icon identifier for the extension
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `extension_features`
      - `id` (uuid, primary key)
      - `extension_id` (uuid, foreign key to extensions)
      - `feature_key` (text) - Unique identifier for the feature (e.g., 'work_management', 'stl_scan')
      - `feature_name` (text) - Display name of the feature
      - `description` (text) - Feature description
      - `created_at` (timestamptz)

    - `user_extensions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `profile_id` (uuid, foreign key to profiles)
      - `extension_id` (uuid, foreign key to extensions)
      - `status` (text) - active, expired, cancelled, pending
      - `start_date` (timestamptz) - Subscription start date
      - `expiry_date` (timestamptz) - Next billing/expiry date
      - `auto_renew` (boolean) - Whether subscription auto-renews
      - `stripe_subscription_id` (text) - Stripe subscription ID
      - `cancelled_at` (timestamptz) - When subscription was cancelled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `extension_payments`
      - `id` (uuid, primary key)
      - `user_extension_id` (uuid, foreign key to user_extensions)
      - `user_id` (uuid, foreign key to auth.users)
      - `extension_id` (uuid, foreign key to extensions)
      - `amount` (decimal) - Payment amount
      - `currency` (text) - Currency code (EUR, USD, etc.)
      - `payment_date` (timestamptz) - Date of payment
      - `status` (text) - succeeded, failed, pending, refunded
      - `stripe_payment_intent_id` (text) - Stripe payment intent ID
      - `stripe_invoice_id` (text) - Stripe invoice ID
      - `metadata` (jsonb) - Additional payment metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for super admin to manage everything
    - Add policies for users to view their own extensions
    - Add policies for authenticated users to view available extensions

  3. Functions
    - Function to check if user has access to a specific feature
    - Function to check if extension subscription is active
    - Trigger to update user_extensions status based on expiry_date
*/

-- Create extensions table
CREATE TABLE IF NOT EXISTS extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  monthly_price decimal(10, 2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  icon text DEFAULT 'package',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create extension_features table
CREATE TABLE IF NOT EXISTS extension_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(extension_id, feature_key)
);

-- Create user_extensions table
CREATE TABLE IF NOT EXISTS user_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  extension_id uuid NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  start_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  auto_renew boolean DEFAULT true,
  stripe_subscription_id text,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, extension_id)
);

-- Create extension_payments table
CREATE TABLE IF NOT EXISTS extension_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_extension_id uuid REFERENCES user_extensions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extension_id uuid NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  currency text DEFAULT 'EUR',
  payment_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_extension_features_extension_id ON extension_features(extension_id);
CREATE INDEX IF NOT EXISTS idx_extension_features_feature_key ON extension_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_user_extensions_user_id ON user_extensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_extensions_profile_id ON user_extensions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_extensions_extension_id ON user_extensions(extension_id);
CREATE INDEX IF NOT EXISTS idx_user_extensions_status ON user_extensions(status);
CREATE INDEX IF NOT EXISTS idx_user_extensions_expiry_date ON user_extensions(expiry_date);
CREATE INDEX IF NOT EXISTS idx_extension_payments_user_id ON extension_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_payments_user_extension_id ON extension_payments(user_extension_id);
CREATE INDEX IF NOT EXISTS idx_extension_payments_status ON extension_payments(status);

-- Enable RLS
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for extensions table
CREATE POLICY "Anyone can view active extensions"
  ON extensions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admin can manage all extensions"
  ON extensions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for extension_features table
CREATE POLICY "Anyone can view features of active extensions"
  ON extension_features FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM extensions
      WHERE extensions.id = extension_features.extension_id
      AND extensions.is_active = true
    )
  );

CREATE POLICY "Super admin can manage all extension features"
  ON extension_features FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for user_extensions table
CREATE POLICY "Users can view their own extensions"
  ON user_extensions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all user extensions"
  ON user_extensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can manage all user extensions"
  ON user_extensions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for extension_payments table
CREATE POLICY "Users can view their own extension payments"
  ON extension_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all extension payments"
  ON extension_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can manage all extension payments"
  ON extension_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Function to check if user has access to a specific feature
CREATE OR REPLACE FUNCTION user_has_feature_access(
  p_user_id uuid,
  p_feature_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_extensions ue
    JOIN extension_features ef ON ue.extension_id = ef.extension_id
    WHERE ue.user_id = p_user_id
    AND ef.feature_key = p_feature_key
    AND ue.status = 'active'
    AND (ue.expiry_date IS NULL OR ue.expiry_date > now())
  );
END;
$$;

-- Function to check if user extension is active
CREATE OR REPLACE FUNCTION is_user_extension_active(
  p_user_id uuid,
  p_extension_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_extensions
    WHERE user_id = p_user_id
    AND extension_id = p_extension_id
    AND status = 'active'
    AND (expiry_date IS NULL OR expiry_date > now())
  );
END;
$$;

-- Function to automatically expire subscriptions
CREATE OR REPLACE FUNCTION check_expired_extensions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_extensions
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'active'
  AND expiry_date IS NOT NULL
  AND expiry_date < now();
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extensions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_extensions_updated_at
  BEFORE UPDATE ON extensions
  FOR EACH ROW
  EXECUTE FUNCTION update_extensions_updated_at();

CREATE TRIGGER trigger_update_user_extensions_updated_at
  BEFORE UPDATE ON user_extensions
  FOR EACH ROW
  EXECUTE FUNCTION update_extensions_updated_at();

-- Insert default extensions
INSERT INTO extensions (name, description, monthly_price, icon, sort_order) VALUES
  ('Gestion des Travaux', 'Système complet de gestion des travaux avec Kanban, affectation des employés et suivi de progression', 29.99, 'kanban-square', 1),
  ('Scan STL', 'Téléchargement, visualisation et gestion de fichiers STL 3D pour prothèses dentaires', 19.99, 'scan', 2),
  ('Gestion des Employés', 'Module complet de gestion des employés avec permissions, affectations et suivi d''activité', 24.99, 'users', 3),
  ('Gestion des Lots', 'Système de gestion des lots de matériaux avec traçabilité et dates de péremption', 14.99, 'package-2', 4),
  ('Gestion des Ressources', 'Gestion avancée des ressources et matériaux avec variantes et suivi de stock', 19.99, 'boxes', 5)
ON CONFLICT DO NOTHING;

-- Insert default features for each extension
INSERT INTO extension_features (extension_id, feature_key, feature_name, description)
SELECT id, 'work_management', 'Gestion des Travaux', 'Accès complet au module de gestion des travaux'
FROM extensions WHERE name = 'Gestion des Travaux'
ON CONFLICT DO NOTHING;

INSERT INTO extension_features (extension_id, feature_key, feature_name, description)
SELECT id, 'stl_scan', 'Scan STL', 'Téléchargement et visualisation de fichiers STL'
FROM extensions WHERE name = 'Scan STL'
ON CONFLICT DO NOTHING;

INSERT INTO extension_features (extension_id, feature_key, feature_name, description)
SELECT id, 'employee_management', 'Gestion des Employés', 'Accès au module de gestion des employés'
FROM extensions WHERE name = 'Gestion des Employés'
ON CONFLICT DO NOTHING;

INSERT INTO extension_features (extension_id, feature_key, feature_name, description)
SELECT id, 'batch_management', 'Gestion des Lots', 'Accès au module de gestion des lots'
FROM extensions WHERE name = 'Gestion des Lots'
ON CONFLICT DO NOTHING;

INSERT INTO extension_features (extension_id, feature_key, feature_name, description)
SELECT id, 'resource_management', 'Gestion des Ressources', 'Accès au module de gestion des ressources'
FROM extensions WHERE name = 'Gestion des Ressources'
ON CONFLICT DO NOTHING;
