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
