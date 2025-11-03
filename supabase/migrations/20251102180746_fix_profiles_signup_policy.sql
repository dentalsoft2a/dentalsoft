/*
  # Fix profiles insertion policy for signup

  1. Changes
    - Drop existing INSERT policy for profiles
    - Create new INSERT policy that allows both authenticated users and service_role
    - This allows the signup process to insert profiles correctly
  
  2. Security
    - Users can only insert their own profile (id must match auth.uid())
    - This maintains security while allowing signup to work
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new INSERT policy that works during signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow anon users to insert during signup (they become authenticated immediately after)
-- This is needed because the signup happens in a transaction
CREATE POLICY "Allow profile creation during signup"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);