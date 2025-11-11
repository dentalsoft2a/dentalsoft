/*
  # Add Bank Information Fields to Profiles

  ## Overview
  Add IBAN and BIC fields to the profiles table to allow displaying bank information on invoices.

  ## Changes
  1. New Columns
    - `bank_iban` (text, nullable) - International Bank Account Number
    - `bank_bic` (text, nullable) - Bank Identifier Code (SWIFT code)

  ## Notes
  - Fields are nullable to allow users who don't need this information to leave it empty
  - Users can configure these fields from the settings page
  - Will be displayed on invoice PDFs for payment instructions
*/

-- Add bank_iban column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bank_iban'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN bank_iban text;
  END IF;
END $$;

-- Add bank_bic column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bank_bic'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN bank_bic text;
  END IF;
END $$;
