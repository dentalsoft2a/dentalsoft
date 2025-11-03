/*
  # Final Fix for Access Codes RLS
  
  1. Problem
    - Complex policies causing conflicts
    - Need clean, simple policies that work
    
  2. Solution
    - Drop ALL existing policies
    - Create new simple policies
    - One UPDATE policy that handles both users and super admins
    - Clear separation of concerns
    
  3. Security
    - Super admins can do everything
    - Regular users can only redeem available codes for themselves
*/

-- Drop ALL existing policies on access_codes
DROP POLICY IF EXISTS "Super admins can delete codes" ON access_codes;
DROP POLICY IF EXISTS "Super admins can create codes" ON access_codes;
DROP POLICY IF EXISTS "Super admins can view all codes" ON access_codes;
DROP POLICY IF EXISTS "Users can view available codes" ON access_codes;
DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;
DROP POLICY IF EXISTS "Super admins can update codes" ON access_codes;
DROP POLICY IF EXISTS "Super admins can manage access codes" ON access_codes;

-- SELECT: Everyone can view codes based on role
CREATE POLICY "access_codes_select_policy"
  ON access_codes FOR SELECT
  TO authenticated
  USING (
    -- Super admins see everything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- Regular users only see available codes
    (is_used = false AND (expires_at IS NULL OR expires_at > now()))
  );

-- INSERT: Only super admins
CREATE POLICY "access_codes_insert_policy"
  ON access_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- UPDATE: Super admins can update anything, users can redeem
CREATE POLICY "access_codes_update_policy"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any code
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- Regular users can update available codes
    (is_used = false AND (expires_at IS NULL OR expires_at > now()))
  )
  WITH CHECK (
    -- Super admins can set any values
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- Regular users can only mark as used by themselves
    (is_used = true AND used_by = auth.uid())
  );

-- DELETE: Only super admins
CREATE POLICY "access_codes_delete_policy"
  ON access_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
