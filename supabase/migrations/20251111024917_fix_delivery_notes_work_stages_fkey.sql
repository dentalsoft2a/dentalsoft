/*
  # Fix Foreign Key Relationship for Work Stages

  ## Description
  Adds the missing foreign key constraint between delivery_notes.current_stage_id
  and work_stages.id to allow Supabase to properly join these tables.

  ## Changes
  - Add foreign key constraint on delivery_notes.current_stage_id referencing work_stages(id)

  ## Security
  - No RLS changes needed
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_notes_current_stage_id_fkey'
      AND table_name = 'delivery_notes'
  ) THEN
    ALTER TABLE delivery_notes
    ADD CONSTRAINT delivery_notes_current_stage_id_fkey
    FOREIGN KEY (current_stage_id)
    REFERENCES work_stages(id)
    ON DELETE SET NULL;
  END IF;
END $$;