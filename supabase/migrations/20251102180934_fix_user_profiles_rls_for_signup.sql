/*
  # Fix user_profiles RLS policies for signup

  1. Changes
    - Modify INSERT policy to allow profile creation during signup
    - The trigger uses SECURITY DEFINER so it runs with elevated privileges
    - But we need to allow INSERT for the trigger to work properly
  
  2. Security
    - Users can only insert their own profile (id must match auth.uid())
    - Super admins can insert any profile
    - Anonymous users can insert during signup process
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Super admins can insert profiles" ON user_profiles;

-- Create new INSERT policy for authenticated users
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR (auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Allow anonymous users to insert during signup (for the trigger)
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles FOR INSERT
  TO anon
  WITH CHECK (true);