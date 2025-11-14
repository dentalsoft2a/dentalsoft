/*
  # Add patient_code field to patients table

  1. Changes
    - Add `patient_code` column to patients table
      - text type, optional, unique per user
      - Used to store a unique identifier for each patient
    
  2. Security
    - No changes to RLS policies needed
    - The patient_code follows the same access rules as other patient fields
*/

-- Add patient_code column to patients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'patient_code'
  ) THEN
    ALTER TABLE patients ADD COLUMN patient_code text;
  END IF;
END $$;

-- Create index for patient_code lookups
CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(user_id, patient_code);

-- Add unique constraint per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patients_user_id_patient_code_key'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_user_id_patient_code_key UNIQUE (user_id, patient_code);
  END IF;
END $$;
