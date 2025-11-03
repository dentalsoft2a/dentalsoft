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