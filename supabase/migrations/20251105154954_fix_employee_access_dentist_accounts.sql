/*
  # Fix employee access to dentist_accounts

  1. Changes
    - Drop the restrictive policy that only allows viewing dentists who submitted photos
    - Add policy for employees to view ALL dentist accounts (unrestricted)
    - Dentist accounts are not tied to a specific laboratory, they are shared
  
  2. Security
    - Employees can view all dentist accounts to be able to create documents for any dentist
    - Dentist accounts themselves don't contain sensitive data, just contact info
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Employees can view dentists who submitted to their lab" ON dentist_accounts;

-- Allow ALL authenticated users (including employees) to view dentist accounts
-- This is necessary because dentist_accounts are not tied to a specific laboratory
CREATE POLICY "Authenticated users can view all dentist accounts"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (true);
