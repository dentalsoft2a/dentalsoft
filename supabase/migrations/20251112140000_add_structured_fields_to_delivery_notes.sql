/*
  # Add structured fields to delivery_notes

  1. Changes
    - Add `work_description` (text) - Description of the dental work
    - Add `tooth_numbers` (text) - Tooth numbers involved
    - Add `shade` (text) - Shade/color of the prosthesis
    - These fields separate structured data from the general notes field

  2. Notes
    - The `notes` field remains for additional free-form notes
    - New fields make it easier to display and process specific information
    - Fields are nullable to maintain backward compatibility with existing records
*/

-- Add structured fields to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'work_description'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN work_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'tooth_numbers'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN tooth_numbers text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'shade'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN shade text;
  END IF;
END $$;
