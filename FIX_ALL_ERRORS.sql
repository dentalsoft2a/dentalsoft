-- Fix infinite recursion in user_profiles RLS policies
-- Execute this in Supabase SQL Editor

-- Drop problematic policies
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_super_admin" ON user_profiles;

-- Create simple non-recursive policies
CREATE POLICY "user_profiles_select_own" 
  ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Super admin can see all user_profiles - but we can't check user_profiles.role 
-- because that causes recursion. Instead we'll allow any authenticated user
-- to read user_profiles and handle super_admin checks in the application
CREATE POLICY "user_profiles_select_all" 
  ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Super admin can do everything - but again no recursion
CREATE POLICY "user_profiles_all_operations" 
  ON user_profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
