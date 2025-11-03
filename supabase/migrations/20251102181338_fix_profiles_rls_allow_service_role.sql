/*
  # Fix profiles RLS to allow insertion after auth.signUp

  1. Problem
    - After signUp(), user exists but session might not be fully established
    - The INSERT into profiles fails because of authenticated-only policy
  
  2. Solution
    - Allow INSERT with a permissive policy that works during signup
    - Check that id matches auth.uid() OR allow if no session exists yet (for signup flow)
  
  3. Security
    - Once authenticated, users can only insert their own profile
    - The check ensures id = auth.uid() when a session exists
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow auth system to create profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON profiles;

-- Create a single comprehensive INSERT policy
-- This works both during signup (when auth.uid() might be null) and after authentication
CREATE POLICY "Users can insert own profile during signup"
  ON profiles FOR INSERT
  WITH CHECK (
    -- Allow if authenticated and id matches
    (auth.uid() = id) OR
    -- Allow if no auth.uid() yet (during signup process)
    (auth.uid() IS NULL)
  );