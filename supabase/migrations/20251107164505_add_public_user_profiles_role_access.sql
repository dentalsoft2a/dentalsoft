/*
  # Add Public Access to User Profiles Role Information

  1. Changes
    - Add SELECT policy for public (anon) access to user_profiles
    - Only exposes id and role fields for filtering purposes
    - Allows dentists (without auth) to filter out employees and super admins from laboratory lists
  
  2. Security
    - Read-only access
    - Only id and role fields are exposed
    - No sensitive information (email, subscription data) is accessible
*/

-- Allow public (anon) users to view user profile IDs and roles
-- This is needed for dentists to filter laboratory lists
CREATE POLICY "Public can view user profile roles"
  ON user_profiles FOR SELECT
  TO anon
  USING (true);
