/*
  # Fix Super Admin RLS Policies

  1. Problem
    - Current policies check auth.jwt() for role, but JWT doesn't contain user_profiles data
    - Super admins can't see all users because the role check fails
  
  2. Solution
    - Create a helper function to check if current user is super admin
    - Update all policies to use this function instead of JWT check
  
  3. Security
    - Function checks user_profiles table directly
    - Maintains same security level with correct implementation
*/

-- Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;

-- Recreate policies with correct super admin check
CREATE POLICY "Users can view own profile or super admin can view all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_super_admin());

CREATE POLICY "Users can update own profile or super admin can update all"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_super_admin())
  WITH CHECK (auth.uid() = id OR is_super_admin());

CREATE POLICY "Users can insert own profile or super admin can insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR is_super_admin());

CREATE POLICY "Super admins can delete any profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_super_admin());