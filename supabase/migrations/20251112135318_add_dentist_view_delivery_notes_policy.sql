/*
  # Add RLS policy for dentists to view their delivery notes
  
  1. Security Changes
    - Add policy allowing dentist_accounts to view delivery notes linked to their dentist profiles
    - This policy was missing and prevents dentists from seeing their own delivery requests
    
  2. Policy Details
    - Checks if the user's dentist_account is linked to the dentist profile via linked_dentist_account_id
    - Allows SELECT operations on delivery_notes table
    - Only affects authenticated users with dentist_accounts
*/

-- Drop existing policy if it exists (in case it was partially created)
DROP POLICY IF EXISTS "Dentists can view their delivery notes" ON delivery_notes;

-- Create policy for dentists to view delivery notes linked to their account
CREATE POLICY "Dentists can view their delivery notes"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dentists
      WHERE dentists.id = delivery_notes.dentist_id
      AND dentists.linked_dentist_account_id = auth.uid()
    )
  );
