/*
  # Add laboratory response field to photo submissions

  1. Changes
    - Add `laboratory_response` column to `photo_submissions` table
      - Type: text (nullable)
      - Purpose: Allow laboratories to add comments/responses to photo submissions
  
  2. Notes
    - This field is optional and can be updated by laboratories when reviewing photos
*/

-- Add laboratory_response column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'laboratory_response'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN laboratory_response text;
  END IF;
END $$;
