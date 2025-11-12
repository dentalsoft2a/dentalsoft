/*
  # Add dentist account delivery note creation policy

  1. Changes
    - Add INSERT policy for dentist accounts to create delivery notes
      - Allows dentists to create delivery notes for laboratories they are linked to
      - Validates the dentist is properly linked via the dentists table
      - Ensures the delivery note is created for a laboratory they have access to
  
  2. Security
    - Only authenticated dentist accounts can create delivery notes
    - Must have a valid link in the dentists table
    - Can only create notes for laboratories they are linked to via linked_dentist_account_id
*/

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Dentist accounts can create delivery notes for linked laboratories" ON delivery_notes;

-- Create policy for dentist accounts to insert delivery notes
CREATE POLICY "Dentist accounts can create delivery notes for linked laboratories"
  ON delivery_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if the authenticated user is a dentist account creating a note for a linked laboratory
    EXISTS (
      SELECT 1 
      FROM dentists d
      WHERE d.linked_dentist_account_id = auth.uid()  -- Current user is the dentist account
        AND d.user_id = delivery_notes.user_id         -- Delivery note is for the laboratory they're linked to
    )
  );
