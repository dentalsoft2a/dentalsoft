/*
  # Fix is_super_admin() function to use email instead of id

  1. Changes
    - Update is_super_admin() function to use auth.jwt()->>'email' instead of auth.uid()
    - This fixes the issue where super_admin role was not being detected correctly

  2. Security
    - Maintains SECURITY DEFINER to bypass RLS
    - Uses email from JWT which is always available for authenticated users
*/

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Use email from JWT instead of auth.uid()
  SELECT (role = 'super_admin') INTO is_admin
  FROM user_profiles
  WHERE email = auth.jwt()->>'email'
  LIMIT 1;

  RETURN COALESCE(is_admin, false);
END;
$$;
