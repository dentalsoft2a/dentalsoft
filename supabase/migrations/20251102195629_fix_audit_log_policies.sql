/*
  # Fix Admin Audit Log Policies
  
  1. Problem
    - Policies check auth.jwt() ->> 'role' but role is in user_profiles table
    - Need to check user_profiles.role instead
    
  2. Solution
    - Update policies to query user_profiles table
    - Check if user is super_admin via EXISTS query
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view audit log" ON admin_audit_log;
DROP POLICY IF EXISTS "Super admins can create audit log entries" ON admin_audit_log;

-- Recreate with correct checks
CREATE POLICY "Super admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can create audit log entries"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
