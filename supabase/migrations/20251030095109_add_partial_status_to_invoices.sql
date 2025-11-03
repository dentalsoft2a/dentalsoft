/*
  # Add partial payment status to invoices

  1. Changes
    - Add 'partial' status to invoices table status check constraint
    - This allows tracking invoices that have been partially paid

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  -- Drop the existing check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_status_check'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
  END IF;

  -- Add new constraint with 'partial' status
  ALTER TABLE invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'sent', 'paid', 'partial'));
END $$;