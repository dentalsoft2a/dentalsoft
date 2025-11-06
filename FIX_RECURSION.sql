/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - is_super_admin() queries user_profiles
    - user_profiles policies call is_super_admin()
    - Creates infinite recursion

  2. Solution
    - Drop all policies using is_super_admin()
    - Drop the function
    - Create new function that's RLS-safe
    - Recreate policies with non-recursive approach

  3. Security
    - Maintain same security level
    - Use SECURITY DEFINER to bypass RLS in function only
*/

-- Step 1: Drop all policies that use is_super_admin()
-- user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile or super admin can view all" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile or super admin can update all" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile or super admin can insert" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins have full access" ON user_profiles;

-- smtp_settings policies
DROP POLICY IF EXISTS "Super admins can view SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Super admins can insert SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Super admins can update SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Super admins can delete SMTP settings" ON smtp_settings;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;

-- Step 3: Create new RLS-safe function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS completely
  SELECT (role = 'super_admin') INTO is_admin
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Step 4: Recreate user_profiles policies (simple, non-recursive)
-- Regular users can view/update their own profile
CREATE POLICY "Users view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Super admins have full access (now safe because function uses SECURITY DEFINER)
CREATE POLICY "Super admins full access"
  ON user_profiles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Step 5: Recreate smtp_settings policies
CREATE POLICY "Super admins view SMTP"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins insert SMTP"
  ON smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins update SMTP"
  ON smtp_settings FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins delete SMTP"
  ON smtp_settings FOR DELETE
  TO authenticated
  USING (is_super_admin());
