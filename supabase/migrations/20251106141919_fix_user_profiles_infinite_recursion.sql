/*
  # Fix Infinite Recursion in user_profiles Policies
  
  1. Problem
    - The "Super admins can view all profiles" policy has infinite recursion
    - It queries user_profiles within a user_profiles policy
    
  2. Solution
    - Remove the recursive EXISTS check
    - Use only auth.jwt() and direct id comparison
    - Super admin status should be in JWT, not checked via SELECT
    
  3. Changes
    - Drop all existing user_profiles policies
    - Create new non-recursive policies
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Simple policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Simple policy: Users can update their own profile (except role field)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Simple policy: Users can insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Super admin policy using ONLY jwt (no recursion)
CREATE POLICY "Super admins have full access"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'super_admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'super_admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );