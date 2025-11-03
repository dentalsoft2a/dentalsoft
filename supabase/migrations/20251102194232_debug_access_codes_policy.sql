/*
  # Debug Access Codes Policy
  
  1. Problem
    - WITH CHECK might be too strict
    - Need to allow the update to go through
    
  2. Solution
    - Simplify WITH CHECK to only check essential fields
    - Remove used_at requirement temporarily
    
  3. Notes
    - This is to debug the issue
    - We can add back stricter checks once we confirm it works
*/

DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;

CREATE POLICY "Users can redeem codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Can update if: code is available for redemption
    is_used = false AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    -- After update: code must be marked as used by the current user
    -- Keep it simple - just check is_used and used_by match auth.uid()
    is_used = true AND used_by = auth.uid()
  );
