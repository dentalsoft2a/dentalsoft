/*
  # Create Alert System

  1. New Tables
    - `alerts`
      - `id` (uuid, primary key)
      - `title` (text) - Short title of the alert
      - `message` (text) - Full alert message
      - `type` (text) - Alert type: info, warning, error, success
      - `is_active` (boolean) - Whether the alert is currently active
      - `start_date` (timestamptz) - When to start showing the alert
      - `end_date` (timestamptz) - Optional end date for the alert
      - `created_at` (timestamptz)
      - `created_by` (uuid) - Reference to user who created it
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `alerts` table
    - Super admins can manage all alerts (insert, update, delete)
    - All authenticated users can view active alerts
    
  3. Notes
    - Only one alert should be active at a time (enforced by application logic)
    - Alerts automatically show/hide based on start_date and end_date
    - Super admins can manually activate/deactivate alerts
*/

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_active boolean DEFAULT false,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active alerts within date range
CREATE POLICY "Authenticated users can view active alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date >= now())
  );

-- Super admins can view all alerts
CREATE POLICY "Super admins can view all alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can insert alerts
CREATE POLICY "Super admins can insert alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Super admins can update alerts
CREATE POLICY "Super admins can update alerts"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Super admins can delete alerts
CREATE POLICY "Super admins can delete alerts"
  ON alerts
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alerts_updated_at();