-- Fix all database errors
-- Execute this in Supabase SQL Editor

-- 1. Fix infinite recursion in user_profiles policies
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_super_admin" ON user_profiles;

-- Simple policies without recursion
CREATE POLICY "user_profiles_select" 
  ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "user_profiles_select_super_admin" 
  ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "user_profiles_all_super_admin" 
  ON user_profiles 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );
