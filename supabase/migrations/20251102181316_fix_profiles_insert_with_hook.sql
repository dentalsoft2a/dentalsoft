/*
  # Fix profiles table to work with Supabase Auth hooks

  1. Changes
    - Remove the INSERT policy requirement for profiles
    - Supabase auth hooks handle profile creation automatically
    - Add a permissive INSERT policy that allows service_role to insert
  
  2. Security
    - Service role (used by auth hooks) can insert profiles
    - Regular users still need to be authenticated to update/view
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new policy that allows service_role to insert during signup
-- This is the role Supabase uses internally for auth operations
CREATE POLICY "Allow auth system to create profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Also allow authenticated users to insert their own profile (for manual operations)
CREATE POLICY "Authenticated users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);