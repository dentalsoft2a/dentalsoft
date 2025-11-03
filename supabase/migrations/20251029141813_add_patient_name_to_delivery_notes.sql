/*
  # Add patient_name to delivery_notes

  1. Changes
    - Add `patient_name` (text) column to `delivery_notes` table
    - This allows storing the patient name directly as a text field instead of a reference
*/

-- Add patient_name column to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN patient_name text;
  END IF;
END $$;