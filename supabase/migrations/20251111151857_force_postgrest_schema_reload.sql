/*
  # Force PostgREST schema reload

  1. Purpose
    - Force PostgREST to reload the database schema and policies
    - This ensures that the new employee policies are active

  2. Changes
    - Send a NOTIFY signal to PostgREST to reload schema cache
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Also add a comment to force a schema change detection
COMMENT ON TABLE delivery_note_stages IS 'Stage tracking for delivery notes - updated for employee permissions';
