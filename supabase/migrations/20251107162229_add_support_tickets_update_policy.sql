/*
  # Add UPDATE policy for support tickets

  1. Changes
    - Add policy to allow super admins to update support tickets
    - This fixes the issue where ticket status changes don't persist

  2. Security
    - Only super admins can update tickets
    - Users cannot update their own tickets (by design)
*/

-- Allow super admins to update support tickets
CREATE POLICY "Super admins can update tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));
