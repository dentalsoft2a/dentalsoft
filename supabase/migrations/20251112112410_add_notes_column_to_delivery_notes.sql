/*
  # Add notes column to delivery_notes table

  1. Changes
    - Add `notes` column to `delivery_notes` table
      - Type: text (nullable)
      - Stores additional notes and information for delivery notes
      - Used by dentists when creating delivery requests
  
  2. Why
    - The dentist portal creates delivery notes with a `notes` field
    - This field is currently missing from the schema
    - Adding it allows dentists to include detailed descriptions and specifications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN notes text;
  END IF;
END $$;
