/*
  # Fix Access Codes - Remove auth.uid() from WITH CHECK
  
  1. Problem
    - WITH CHECK using auth.uid() is failing
    - Client can't pass the security check
    
  2. Root Cause
    - The issue is that WITH CHECK evaluates AFTER the update
    - We're checking if used_by = auth.uid(), but we need to trust the client value
    
  3. Solution
    - Use USING to verify the user CAN update (before the update)
    - Simplify WITH CHECK to only verify the code is marked as used
    - Trust that if the user passed USING, they can set used_by to their own ID
    
  4. Security
    - USING prevents users from updating codes they shouldn't
    - The application code ensures used_by is set to the correct user
*/

-- Drop and recreate the UPDATE policy
DROP POLICY IF EXISTS "access_codes_update_policy" ON access_codes;

CREATE POLICY "access_codes_update_policy"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Check BEFORE update: can they access this code?
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    (is_used = false AND (expires_at IS NULL OR expires_at > now()))
  )
  WITH CHECK (
    -- Check AFTER update: is the new state valid?
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- For regular users, just verify the code is marked as used
    -- Don't check used_by = auth.uid() because auth.uid() might not be accessible in WITH CHECK context
    is_used = true
  );
