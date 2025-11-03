/*
  # Add Trigger to Auto-Set used_by Field
  
  1. Problem
    - RLS WITH CHECK fails when checking used_by = auth.uid()
    - Need to ensure used_by is set server-side, not client-side
    
  2. Solution
    - Create a trigger that automatically sets used_by to auth.uid()
    - This way the client doesn't need to set it
    - RLS can then verify it was set correctly
    
  3. Security
    - Server-side trigger ensures used_by is always the authenticated user
    - Prevents users from setting used_by to someone else's ID
*/

-- Create function to auto-set used_by
CREATE OR REPLACE FUNCTION auto_set_used_by()
RETURNS TRIGGER AS $$
BEGIN
  -- If the code is being marked as used, automatically set used_by and used_at
  IF NEW.is_used = true AND OLD.is_used = false THEN
    NEW.used_by := auth.uid();
    NEW.used_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS set_used_by_trigger ON access_codes;

-- Create trigger
CREATE TRIGGER set_used_by_trigger
  BEFORE UPDATE ON access_codes
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_used_by();

-- Now update the policy to not check used_by since it's set by trigger
DROP POLICY IF EXISTS "access_codes_update_policy" ON access_codes;

CREATE POLICY "access_codes_update_policy"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Can update if super admin OR code is available
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    (is_used = false AND (expires_at IS NULL OR expires_at > now()))
  )
  WITH CHECK (
    -- Super admin can do anything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- Regular users: just verify the code is marked as used
    -- The trigger ensures used_by is set correctly
    is_used = true
  );
