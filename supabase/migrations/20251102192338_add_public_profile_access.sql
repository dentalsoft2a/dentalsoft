/*
  # Add Public Profile Access for Help Center

  1. Changes
    - Add policy to allow authenticated users to view basic profile info of other users
    - This enables the Help Center to display author names on topics and replies

  2. Security
    - Users can view first_name, last_name, and laboratory_name of all profiles
    - Users can still only update their own profile
    - This is necessary for community features like Help Center
*/

-- Add policy to allow authenticated users to view all profiles (read-only)
CREATE POLICY "Users can view all profiles for community features"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
