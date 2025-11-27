/*
  # Update automatic photo deletion to 2 months

  1. Changes
    - Update the delete_old_photo_submissions function to delete photos older than 2 months instead of 1 month
    - This applies to both photo_submissions and the associated storage files
    
  2. Behavior
    - Photos and their history are automatically deleted after 2 months
    - Scheduled job runs daily at 2 AM
    - Helps manage storage and comply with data retention policies
    
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only deletes submissions older than 2 months
*/

-- Update function to delete photo submissions older than 2 months
CREATE OR REPLACE FUNCTION delete_old_photo_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete photo submissions older than 2 months
  WITH deleted AS (
    DELETE FROM photo_submissions
    WHERE created_at < NOW() - INTERVAL '2 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion count (optional, for monitoring)
  RAISE NOTICE 'Deleted % old photo submissions (older than 2 months)', deleted_count;
END;
$$;

-- The cron job is already scheduled in the previous migration
-- If we need to update the schedule, we can unschedule and reschedule:
-- SELECT cron.unschedule('delete-old-photos');
-- SELECT cron.schedule(
--   'delete-old-photos',
--   '0 2 * * *',
--   'SELECT delete_old_photo_submissions();'
-- );
