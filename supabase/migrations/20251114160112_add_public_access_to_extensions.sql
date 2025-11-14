/*
  # Allow public access to view active extensions

  1. Changes
    - Add policy to allow anonymous users to view active extensions on landing page
  
  2. Security
    - Only SELECT permission
    - Only for active extensions (is_active = true)
    - Read-only access for public users
*/

-- Allow anonymous users to view active extensions
CREATE POLICY "Public can view active extensions"
  ON extensions
  FOR SELECT
  TO anon
  USING (is_active = true);
