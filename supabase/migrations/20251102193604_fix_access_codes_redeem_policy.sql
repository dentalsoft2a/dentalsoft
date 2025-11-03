/*
  # Fix Access Codes Redeem Policy

  1. Problem
    - The current UPDATE policy for access_codes doesn't allow users to update codes
    - The USING clause checks if is_used = false (can only update unused codes)
    - The WITH CHECK clause checks if is_used = true (result must be used)
    - This creates a conflict preventing the update from false to true

  2. Solution
    - Drop the restrictive UPDATE policy
    - Create a new policy that allows users to mark codes as used
    - The policy checks that the code was not used before the update
    - And allows setting it to used with the current user

  3. Security
    - Users can only update codes that are not already used
    - Users can only mark codes as used by themselves
    - Codes must not be expired
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;

-- Create a new policy that allows users to redeem (update) codes
CREATE POLICY "Users can redeem codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Can only update codes that are not used and not expired
    is_used = false 
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    -- After update, code must be marked as used by current user
    is_used = true 
    AND used_by = auth.uid()
    AND used_at IS NOT NULL
  );
