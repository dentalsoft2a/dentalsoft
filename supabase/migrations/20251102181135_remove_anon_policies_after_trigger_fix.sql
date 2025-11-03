/*
  # Remove temporary anon policies

  1. Changes
    - Remove anon policies from profiles and user_profiles
    - These were temporary workarounds and are no longer needed
    - The trigger now properly uses SECURITY DEFINER to bypass RLS
  
  2. Security
    - Improves security by removing overly permissive anon policies
    - Only authenticated users can insert their own profiles
    - The trigger handles user_profiles creation automatically
*/

-- Remove anon policy from profiles
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

-- Remove anon policy from user_profiles
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;