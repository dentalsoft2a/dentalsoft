/*
  # SMTP Settings Configuration for Super Admin

  1. New Tables
    - `smtp_settings`
      - `id` (uuid, primary key)
      - `configured_by` (uuid, references auth.users) - Super admin who configured
      - `smtp_host` (text) - SMTP server host
      - `smtp_port` (integer) - SMTP server port
      - `smtp_secure` (boolean) - Use TLS/SSL
      - `smtp_user` (text) - SMTP username
      - `smtp_password` (text) - SMTP password (encrypted)
      - `from_email` (text) - Default sender email
      - `from_name` (text) - Default sender name
      - `is_active` (boolean) - Active configuration
      - `test_email_sent` (boolean) - Test email status
      - `last_tested_at` (timestamptz) - Last test timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `smtp_settings` table
    - Only super admins can read/write SMTP settings
    - Ensure only one active configuration at a time

  3. Important Notes
    - SMTP passwords should be encrypted in production
    - Only super admins have access to this table
    - System-wide settings, not per-user
*/

-- Create smtp_settings table
CREATE TABLE IF NOT EXISTS smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean DEFAULT true,
  smtp_user text NOT NULL,
  smtp_password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'GB Dental',
  is_active boolean DEFAULT true,
  test_email_sent boolean DEFAULT false,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view SMTP settings
CREATE POLICY "Super admins can view SMTP settings"
  ON smtp_settings
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Policy: Only super admins can insert SMTP settings
CREATE POLICY "Super admins can insert SMTP settings"
  ON smtp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Policy: Only super admins can update SMTP settings
CREATE POLICY "Super admins can update SMTP settings"
  ON smtp_settings
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Policy: Only super admins can delete SMTP settings
CREATE POLICY "Super admins can delete SMTP settings"
  ON smtp_settings
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Function to ensure only one active SMTP configuration
CREATE OR REPLACE FUNCTION ensure_single_active_smtp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other configurations
    UPDATE smtp_settings
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active configuration
DROP TRIGGER IF EXISTS ensure_single_active_smtp_trigger ON smtp_settings;
CREATE TRIGGER ensure_single_active_smtp_trigger
  BEFORE INSERT OR UPDATE ON smtp_settings
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_smtp();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_smtp_settings_active ON smtp_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_smtp_settings_configured_by ON smtp_settings(configured_by);