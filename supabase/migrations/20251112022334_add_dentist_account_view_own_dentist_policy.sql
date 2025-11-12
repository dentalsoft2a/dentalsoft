/*
  # Add Dentist Account View Policy
  
  1. Changes
    - Add RLS policy to allow dentist accounts to view their linked dentist records
    - This enables dentist portal users to find their dentist profile via linked_dentist_account_id
  
  2. Security
    - Only allows viewing dentist records where linked_dentist_account_id matches the authenticated user
    - Read-only access for dentist accounts
*/

-- Allow dentist accounts to view their own linked dentist records
CREATE POLICY "Dentist accounts can view their linked dentist records"
  ON dentists
  FOR SELECT
  TO authenticated
  USING (linked_dentist_account_id = auth.uid());
