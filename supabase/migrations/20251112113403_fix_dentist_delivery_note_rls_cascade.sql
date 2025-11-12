/*
  # Fix dentist delivery note RLS - Drop with cascade

  1. Changes
    - Drop the policy first
    - Drop the helper function
    - Recreate the policy with inline checks (no function dependency)
  
  2. Security
    - Laboratory owners can insert delivery notes
    - Laboratory employees can insert delivery notes
    - Dentist accounts can insert delivery notes for linked laboratories
*/

-- Drop existing INSERT policy first
DROP POLICY IF EXISTS "Allow delivery note creation" ON delivery_notes;

-- Now drop the helper function
DROP FUNCTION IF EXISTS can_dentist_insert_delivery_note(uuid, uuid);

-- Create comprehensive INSERT policy without function dependency
CREATE POLICY "Allow delivery note creation"
  ON delivery_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Option 1: User is the laboratory owner
    (user_id = auth.uid())
    OR
    -- Option 2: User is an active employee of the laboratory
    (
      EXISTS (
        SELECT 1 
        FROM laboratory_employees emp
        WHERE emp.user_profile_id = auth.uid() 
          AND emp.is_active = true 
          AND emp.laboratory_profile_id = delivery_notes.user_id
      )
    )
    OR
    -- Option 3: User is a dentist account linked to this laboratory
    (
      EXISTS (
        SELECT 1 
        FROM dentists d
        WHERE d.linked_dentist_account_id = auth.uid()
          AND d.user_id = delivery_notes.user_id
      )
    )
  );

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
