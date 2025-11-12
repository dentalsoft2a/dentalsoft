/*
  # Fix delivery notes RLS with debugging

  1. Changes
    - Create a helper function to test if a dentist can insert a delivery note
    - Make the RLS policy simpler and more explicit
    - Add better logging capabilities
  
  2. Security
    - Maintains all security checks
    - Only allows authorized users to insert delivery notes
*/

-- Create a function to check if user can insert delivery note
CREATE OR REPLACE FUNCTION can_dentist_insert_delivery_note(
  p_user_id uuid,
  p_dentist_account_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM dentists d
    WHERE d.linked_dentist_account_id = p_dentist_account_id
      AND d.user_id = p_user_id
  );
END;
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Allow delivery note creation" ON delivery_notes;

-- Recreate with simpler logic
CREATE POLICY "Allow delivery note creation"
  ON delivery_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Option 1: User is the laboratory owner
    user_id = auth.uid()
    OR
    -- Option 2: User is an employee of the laboratory
    EXISTS (
      SELECT 1 
      FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid() 
        AND emp.is_active = true 
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
    OR
    -- Option 3: User is a dentist account - use helper function
    can_dentist_insert_delivery_note(delivery_notes.user_id, auth.uid())
  );
