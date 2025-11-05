/*
  # Add RCS Field to Profiles

  ## Overview
  Add a customizable RCS (Registre du Commerce et des Sociétés) field to the profiles table.
  This allows users to customize the company registration information displayed on proforma PDFs.

  ## Changes
  1. New Column
    - `laboratory_rcs` (text, nullable) - Company registration information (e.g., "RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A")
    - Default value provided for backward compatibility

  ## Notes
  - Field is nullable to allow users who don't need this information to leave it empty
  - Users can customize this text from the settings page
  - Will be displayed on proforma PDFs
*/

-- Add laboratory_rcs column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'laboratory_rcs'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN laboratory_rcs text DEFAULT 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';
  END IF;
END $$;