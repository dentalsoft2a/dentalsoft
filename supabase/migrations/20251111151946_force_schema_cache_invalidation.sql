/*
  # Force schema cache invalidation
  
  1. Purpose
    - Force PostgREST to immediately reload its schema cache
    - Add and remove a temporary column to trigger cache invalidation
    
  2. Changes
    - Add a temporary column
    - Remove it immediately
    - This forces PostgREST to detect a schema change and reload
*/

-- Add a temporary column to force schema change detection
ALTER TABLE delivery_note_stages ADD COLUMN IF NOT EXISTS _temp_reload_trigger boolean DEFAULT false;

-- Remove it immediately
ALTER TABLE delivery_note_stages DROP COLUMN IF EXISTS _temp_reload_trigger;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
