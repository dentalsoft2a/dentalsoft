/*
  # Add status field to delivery_notes

  1. Changes
    - Add `status` (text) column to `delivery_notes` table
    - Status values: 'pending', 'in_progress', 'completed'
    - Default value: 'pending'
  
  2. Notes
    - This allows tracking the completion status of delivery notes
    - Compatible with existing data (will default to 'pending')
*/

-- Add status column to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'status'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;