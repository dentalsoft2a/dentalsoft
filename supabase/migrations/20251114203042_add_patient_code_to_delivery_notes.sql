/*
  # Add patient_code to delivery_notes table

  1. Changes
    - Add `patient_code` column to delivery_notes table
      - text type, optional
      - Used to store the patient code for quick reference in PDFs
    
  2. Security
    - No changes to RLS policies needed
    - The patient_code follows the same access rules as other delivery note fields
*/

-- Add patient_code column to delivery_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'patient_code'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN patient_code text;
  END IF;
END $$;
