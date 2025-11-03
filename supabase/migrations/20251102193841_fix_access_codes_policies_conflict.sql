/*
  # Fix Access Codes Policies Conflict

  1. Problem
    - The "FOR ALL" policy for super admins might be conflicting with user policies
    - Need to separate policies clearly by operation type

  2. Solution
    - Drop the "FOR ALL" super admin policy
    - Create separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
    - Ensure user UPDATE policy doesn't conflict with super admin policies

  3. Security
    - Super admins can perform all operations
    - Regular users can only view and redeem (update) available codes
*/

-- Drop the super admin "FOR ALL" policy
DROP POLICY IF EXISTS "Super admins can manage access codes" ON access_codes;

-- Super admins can view all codes
CREATE POLICY "Super admins can view all codes"
  ON access_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can create codes
CREATE POLICY "Super admins can create codes"
  ON access_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can update any code
CREATE POLICY "Super admins can update codes"
  ON access_codes FOR UPDATE
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

-- Super admins can delete codes
CREATE POLICY "Super admins can delete codes"
  ON access_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
