/*
  # Create Employee Management System

  1. New Tables
    - `laboratory_employees`
      - `id` (uuid, primary key)
      - `laboratory_profile_id` (uuid, references profiles)
      - `user_profile_id` (uuid, references user_profiles)
      - `email` (text)
      - `full_name` (text)
      - `role_name` (text) - e.g., "Technicien", "Assistant", "Manager"
      - `is_active` (boolean) - can disable employee access
      - `created_at` (timestamptz)
      - `created_by` (uuid, references user_profiles)
    
    - `laboratory_role_permissions`
      - `id` (uuid, primary key)
      - `laboratory_profile_id` (uuid, references profiles)
      - `role_name` (text)
      - `menu_access` (jsonb) - which menus are accessible
      - `permissions` (jsonb) - detailed permissions (read, write, delete, etc.)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Laboratory owners can manage their employees
    - Employees can view their own profile
  
  3. Important Notes
    - Menu access stored as JSON: {"dashboard": true, "proformas": true, "invoices": false, ...}
    - Permissions stored as JSON: {"proformas": {"read": true, "create": true, "edit": false, "delete": false}}
    - When user_profile_id is set, employee can login with their credentials
    - Laboratory owners have full access automatically
*/

-- Create laboratory_employees table
CREATE TABLE IF NOT EXISTS laboratory_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_profile_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role_name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  UNIQUE(laboratory_profile_id, email)
);

-- Create laboratory_role_permissions table
CREATE TABLE IF NOT EXISTS laboratory_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_name text NOT NULL,
  menu_access jsonb DEFAULT '{}'::jsonb NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(laboratory_profile_id, role_name)
);

-- Enable RLS
ALTER TABLE laboratory_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for laboratory_employees

-- Laboratory owners can view their employees
CREATE POLICY "Laboratory owners can view employees"
  ON laboratory_employees
  FOR SELECT
  TO authenticated
  USING (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  );

-- Employees can view their own profile
CREATE POLICY "Employees can view own profile"
  ON laboratory_employees
  FOR SELECT
  TO authenticated
  USING (user_profile_id = auth.uid());

-- Laboratory owners can insert employees
CREATE POLICY "Laboratory owners can insert employees"
  ON laboratory_employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  );

-- Laboratory owners can update their employees
CREATE POLICY "Laboratory owners can update employees"
  ON laboratory_employees
  FOR UPDATE
  TO authenticated
  USING (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  );

-- Laboratory owners can delete their employees
CREATE POLICY "Laboratory owners can delete employees"
  ON laboratory_employees
  FOR DELETE
  TO authenticated
  USING (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  );

-- Policies for laboratory_role_permissions

-- Laboratory owners can view their role permissions
CREATE POLICY "Laboratory owners can view role permissions"
  ON laboratory_role_permissions
  FOR SELECT
  TO authenticated
  USING (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  );

-- Employees can view their laboratory's role permissions
CREATE POLICY "Employees can view role permissions"
  ON laboratory_role_permissions
  FOR SELECT
  TO authenticated
  USING (
    laboratory_profile_id IN (
      SELECT laboratory_profile_id FROM laboratory_employees 
      WHERE user_profile_id = auth.uid() AND is_active = true
    )
  );

-- Laboratory owners can manage role permissions
CREATE POLICY "Laboratory owners can manage role permissions"
  ON laboratory_role_permissions
  FOR ALL
  TO authenticated
  USING (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  )
  WITH CHECK (
    laboratory_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND laboratory_name IS NOT NULL
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_lab_id ON laboratory_employees(laboratory_profile_id);
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_user_id ON laboratory_employees(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_laboratory_role_permissions_lab_id ON laboratory_role_permissions(laboratory_profile_id);

-- Add updated_at trigger for role_permissions
CREATE OR REPLACE FUNCTION update_laboratory_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_laboratory_role_permissions_updated_at
  BEFORE UPDATE ON laboratory_role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_laboratory_role_permissions_updated_at();