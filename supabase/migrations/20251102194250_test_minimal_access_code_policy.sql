/*
  # Test Minimal Access Code Policy
  
  1. Approach
    - Create the most permissive policy possible to test
    - If this works, we know RLS is the issue
    - If it doesn't, the problem is elsewhere
    
  2. Temporary Policy
    - Allow any authenticated user to update any non-used code
    - No WITH CHECK restrictions
    
  3. WARNING
    - This is for testing ONLY
    - NOT secure for production
*/

DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;

-- Extremely permissive policy for testing
CREATE POLICY "Users can redeem codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (true)  -- Allow reading any row
  WITH CHECK (true);  -- Allow any update
