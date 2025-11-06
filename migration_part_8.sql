-- ============================================
-- PARTIE 8/10 - Migrations 57 à 64
-- ============================================

-- ============================================
-- Migration: 20251105121005_add_laboratory_response_to_photo_submissions.sql
-- ============================================

/*
  # Add laboratory response field to photo submissions

  1. Changes
    - Add `laboratory_response` column to `photo_submissions` table
      - Type: text (nullable)
      - Purpose: Allow laboratories to add comments/responses to photo submissions
  
  2. Notes
    - This field is optional and can be updated by laboratories when reviewing photos
*/

-- Add laboratory_response column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'laboratory_response'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN laboratory_response text;
  END IF;
END $$;


-- ============================================
-- Migration: 20251105122029_add_auto_delete_old_photos.sql
-- ============================================

/*
  # Add automatic deletion of old photo submissions

  1. Changes
    - Create a function to delete photo submissions older than 1 month
    - Create a scheduled job using pg_cron to run daily cleanup
    - This helps manage storage and keep the database clean

  2. Security
    - Function runs with definer privileges to bypass RLS
    - Only deletes submissions older than 1 month
*/

-- Create function to delete old photo submissions
CREATE OR REPLACE FUNCTION delete_old_photo_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM photo_submissions
  WHERE created_at < NOW() - INTERVAL '1 month';
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'delete-old-photos',
  '0 2 * * *',
  'SELECT delete_old_photo_submissions();'
);


-- ============================================
-- Migration: 20251105141919_add_dentist_favorite_laboratories.sql
-- ============================================

/*
  # Add Dentist Favorite Laboratories System

  1. New Tables
    - `dentist_favorite_laboratories`
      - `id` (uuid, primary key)
      - `dentist_id` (uuid, references dentist_accounts)
      - `laboratory_profile_id` (uuid, references profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `dentist_favorite_laboratories` table
    - Add policy for dentists to manage their own favorites

  3. Indexes
    - Index on (dentist_id, laboratory_profile_id) for quick lookups
*/

-- Create dentist favorite laboratories table
CREATE TABLE IF NOT EXISTS dentist_favorite_laboratories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid REFERENCES dentist_accounts(id) ON DELETE CASCADE NOT NULL,
  laboratory_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dentist_id, laboratory_profile_id)
);

-- Enable RLS
ALTER TABLE dentist_favorite_laboratories ENABLE ROW LEVEL SECURITY;

-- Dentists can view their own favorites
CREATE POLICY "Dentists can view own favorites"
  ON dentist_favorite_laboratories
  FOR SELECT
  TO authenticated
  USING (
    dentist_id IN (
      SELECT da.id 
      FROM dentist_accounts da
      JOIN auth.users u ON u.email = da.email
      WHERE u.id = auth.uid()
    )
  );

-- Dentists can add their own favorites
CREATE POLICY "Dentists can add own favorites"
  ON dentist_favorite_laboratories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dentist_id IN (
      SELECT da.id 
      FROM dentist_accounts da
      JOIN auth.users u ON u.email = da.email
      WHERE u.id = auth.uid()
    )
  );

-- Dentists can remove their own favorites
CREATE POLICY "Dentists can remove own favorites"
  ON dentist_favorite_laboratories
  FOR DELETE
  TO authenticated
  USING (
    dentist_id IN (
      SELECT da.id 
      FROM dentist_accounts da
      JOIN auth.users u ON u.email = da.email
      WHERE u.id = auth.uid()
    )
  );

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_dentist_favorites_dentist_id 
  ON dentist_favorite_laboratories(dentist_id);

CREATE INDEX IF NOT EXISTS idx_dentist_favorites_laboratory_id 
  ON dentist_favorite_laboratories(laboratory_profile_id);


-- ============================================
-- Migration: 20251105143531_create_employee_management_system.sql
-- ============================================

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

-- ============================================
-- Migration: 20251105150455_add_employee_view_lab_profile_policy.sql
-- ============================================

/*
  # Allow employees to view their laboratory's profile

  1. Changes
    - Add policy to allow employees to view their laboratory's user_profile
    - This enables employees to inherit subscription status from their laboratory
  
  2. Security
    - Employee must have an active record in laboratory_employees table
    - Can only view the profile of their assigned laboratory
*/

CREATE POLICY "Employees can view their laboratory profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = user_profiles.id
        AND laboratory_employees.is_active = true
    )
  );


-- ============================================
-- Migration: 20251105150514_add_employee_photo_submissions_policies.sql
-- ============================================

/*
  # Allow employees to access their laboratory's photo submissions

  1. Changes
    - Add policy to allow employees to view photo submissions sent to their laboratory
    - Add policy to allow employees to update photo submission status for their laboratory
  
  2. Security
    - Employee must have an active record in laboratory_employees table
    - Can only access submissions for their assigned laboratory
*/

CREATE POLICY "Employees can read their laboratory submissions"
  ON photo_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = photo_submissions.laboratory_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can update their laboratory submission status"
  ON photo_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = photo_submissions.laboratory_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = photo_submissions.laboratory_id
        AND laboratory_employees.is_active = true
    )
  );


-- ============================================
-- Migration: 20251105150629_add_employee_access_to_all_tables_v2.sql
-- ============================================

/*
  # Allow employees to access their laboratory's data

  1. Changes
    - Add policies to allow employees to access all data belonging to their laboratory
    - Covers: dentists, proformas, delivery_notes, invoices, patients, catalog_items, resources, etc.
  
  2. Security
    - Employee must have an active record in laboratory_employees table
    - Can only access data for their assigned laboratory
*/

-- Dentists
CREATE POLICY "Employees can view their laboratory dentists"
  ON dentists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory dentists"
  ON dentists FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Proformas
CREATE POLICY "Employees can view their laboratory proformas"
  ON proformas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = proformas.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory proformas"
  ON proformas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = proformas.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = proformas.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Proforma Items
CREATE POLICY "Employees can view their laboratory proforma items"
  ON proforma_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas p
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = p.user_id
      WHERE le.user_profile_id = auth.uid()
        AND p.id = proforma_items.proforma_id
        AND le.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory proforma items"
  ON proforma_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas p
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = p.user_id
      WHERE le.user_profile_id = auth.uid()
        AND p.id = proforma_items.proforma_id
        AND le.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas p
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = p.user_id
      WHERE le.user_profile_id = auth.uid()
        AND p.id = proforma_items.proforma_id
        AND le.is_active = true
    )
  );

-- Delivery Notes
CREATE POLICY "Employees can view their laboratory delivery notes"
  ON delivery_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = delivery_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory delivery notes"
  ON delivery_notes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = delivery_notes.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = delivery_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Invoices
CREATE POLICY "Employees can view their laboratory invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = invoices.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory invoices"
  ON invoices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = invoices.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = invoices.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Patients
CREATE POLICY "Employees can view their laboratory patients"
  ON patients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory patients"
  ON patients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Catalog Items
CREATE POLICY "Employees can view their laboratory catalog items"
  ON catalog_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = catalog_items.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory catalog items"
  ON catalog_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = catalog_items.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = catalog_items.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Resources
CREATE POLICY "Employees can view their laboratory resources"
  ON resources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = resources.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory resources"
  ON resources FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = resources.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = resources.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Resource Variants
CREATE POLICY "Employees can view their laboratory resource variants"
  ON resource_variants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = r.user_id
      WHERE le.user_profile_id = auth.uid()
        AND r.id = resource_variants.resource_id
        AND le.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory resource variants"
  ON resource_variants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = r.user_id
      WHERE le.user_profile_id = auth.uid()
        AND r.id = resource_variants.resource_id
        AND le.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources r
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = r.user_id
      WHERE le.user_profile_id = auth.uid()
        AND r.id = resource_variants.resource_id
        AND le.is_active = true
    )
  );

-- Stock Movements
CREATE POLICY "Employees can view their laboratory stock movements"
  ON stock_movements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = stock_movements.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory stock movements"
  ON stock_movements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = stock_movements.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = stock_movements.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Credit Notes
CREATE POLICY "Employees can view their laboratory credit notes"
  ON credit_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = credit_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory credit notes"
  ON credit_notes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = credit_notes.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = credit_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );


-- ============================================
-- Migration: 20251105152517_add_laboratory_can_view_dentist_accounts.sql
-- ============================================

/*
  # Allow laboratories to view dentist accounts who submitted photos

  1. Changes
    - Add RLS policy to allow laboratories to view dentist accounts information
      when the dentist has submitted photos to them
    - This enables the JOIN in photo_submissions to work properly for laboratory users

  2. Security
    - Laboratories can ONLY see dentist information for dentists who have submitted photos to them
    - No access to other dentists' information
*/

-- Allow laboratories to view dentist accounts who submitted photos to them
CREATE POLICY "Laboratories can view dentists who submitted to them"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photo_submissions
      WHERE photo_submissions.dentist_id = dentist_accounts.id
      AND photo_submissions.laboratory_id = auth.uid()
    )
  );


