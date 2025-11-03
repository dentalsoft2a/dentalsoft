/*
  # Simplify Access Codes User Redemption Policy

  1. Problem
    - Multiple UPDATE policies can conflict in PostgreSQL RLS
    - WITH CHECK clauses are combined with AND, which can cause failures
    - The super admin policy might interfere with user redemption

  2. Solution
    - Make the user redemption policy check both conditions properly
    - Allow users to update if they're either redeeming OR they're super admin
    - Simplify the WITH CHECK to be less restrictive

  3. Security
    - Users can still only redeem available codes for themselves
    - Super admins retain full access
*/

-- Drop and recreate the user redemption policy with better logic
DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;

CREATE POLICY "Users can redeem codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Can update if: code is available for redemption OR user is super admin
    (is_used = false AND (expires_at IS NULL OR expires_at > now()))
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    -- After update: either it's a valid redemption OR user is super admin
    (is_used = true AND used_by = auth.uid() AND used_at IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Remove the separate super admin UPDATE policy since it's now handled above
DROP POLICY IF EXISTS "Super admins can update codes" ON access_codes;
