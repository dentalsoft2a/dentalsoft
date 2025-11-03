/*
  # Add Super Admin Policies for Help Center

  1. Changes
    - Add policies to allow super admins to update help topics (for pinning and status changes)
    - Add policies to allow super admins to delete help topics
    - Add policies to allow super admins to delete help replies

  2. Security
    - Only users with super_admin role can perform these actions
    - Regular users can still only manage their own content
    - Super admins are identified via user_profiles.role = 'super_admin'
*/

-- Super admins can update any topic (for pinning, status changes, etc.)
CREATE POLICY "Super admins can update any topic"
  ON help_topics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can delete any topic
CREATE POLICY "Super admins can delete any topic"
  ON help_topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can delete any reply
CREATE POLICY "Super admins can delete any reply"
  ON help_replies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
