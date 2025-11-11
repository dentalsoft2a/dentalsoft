/*
  # Fix delivery_number unique constraint

  1. Changes
    - Remove global UNIQUE constraint on delivery_number
    - Add composite UNIQUE constraint on (user_id, delivery_number)
    - This allows each laboratory to have their own numbering sequence

  2. Reasoning
    - Currently delivery_number must be unique across ALL laboratories
    - This causes conflicts when different labs use the same number
    - Each lab should have independent numbering (BL-001, BL-002, etc.)
*/

-- Remove the global unique constraint on delivery_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'delivery_notes_delivery_number_key'
  ) THEN
    ALTER TABLE delivery_notes DROP CONSTRAINT delivery_notes_delivery_number_key;
  END IF;
END $$;

-- Add a composite unique constraint on user_id and delivery_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'delivery_notes_user_id_delivery_number_key'
  ) THEN
    ALTER TABLE delivery_notes ADD CONSTRAINT delivery_notes_user_id_delivery_number_key 
      UNIQUE (user_id, delivery_number);
  END IF;
END $$;
