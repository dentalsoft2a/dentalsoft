/*
  # Add Super Admin Delete Policy for Dentist Accounts

  1. Changes
    - Add DELETE policy for super admins on dentist_accounts table
    - Allows super admins to delete any dentist account
  
  2. Security
    - Only super admins can delete dentist accounts
    - Validates super admin role from user_profiles table
*/

-- Allow super admins to delete dentist accounts
CREATE POLICY "Super admins can delete dentist accounts"
  ON dentist_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
