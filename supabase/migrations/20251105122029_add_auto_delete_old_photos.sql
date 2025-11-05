/*
  # Add automatic deletion of old photo submissions

  1. Changes
    - Create a function to delete photo submissions older than 1 month
    - Create a scheduled job using pg_cron to run daily cleanup
    - This helps manage storage and keep the database clean

  2. Security
    - Function runs with definer privileges to bypass RLS
    - Only deletes submissions older than 1 month
*/

-- Create function to delete old photo submissions
CREATE OR REPLACE FUNCTION delete_old_photo_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM photo_submissions
  WHERE created_at < NOW() - INTERVAL '1 month';
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'delete-old-photos',
  '0 2 * * *',
  'SELECT delete_old_photo_submissions();'
);
