/*
  # Add storage cleanup for old photos

  1. Changes
    - Create a function to delete storage files when photo submissions are deleted
    - Add a trigger to automatically clean up storage files
    - Ensure both database records and storage files are deleted after 2 months
    
  2. Behavior
    - When a photo_submission is deleted, its storage file is also deleted
    - Works automatically with the scheduled deletion job
    - Helps manage storage costs and comply with data retention policies
    
  3. Security
    - Function runs with SECURITY DEFINER to access storage
    - Only deletes files associated with deleted records
*/

-- Create function to delete storage files for photo submissions
CREATE OR REPLACE FUNCTION delete_photo_storage_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_path TEXT;
BEGIN
  -- Extract the file path from the photo_url
  -- URL format: https://<project>.supabase.co/storage/v1/object/public/dentist-photos/<path>
  file_path := substring(OLD.photo_url from 'dentist-photos/(.+)$');
  
  IF file_path IS NOT NULL THEN
    -- Delete the file from storage
    -- Note: This uses the storage API, errors are logged but don't stop the deletion
    BEGIN
      PERFORM storage.delete_object('dentist-photos', file_path);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to delete storage file: % - Error: %', file_path, SQLERRM;
    END;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger to delete storage files before deleting photo submissions
DROP TRIGGER IF EXISTS trigger_delete_photo_storage ON photo_submissions;
CREATE TRIGGER trigger_delete_photo_storage
  BEFORE DELETE ON photo_submissions
  FOR EACH ROW
  EXECUTE FUNCTION delete_photo_storage_file();

-- Also update the cleanup function to provide better logging
CREATE OR REPLACE FUNCTION delete_old_photo_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMP;
BEGIN
  cutoff_date := NOW() - INTERVAL '2 months';
  
  -- Delete photo submissions older than 2 months
  -- The trigger will automatically delete associated storage files
  WITH deleted AS (
    DELETE FROM photo_submissions
    WHERE created_at < cutoff_date
    RETURNING id, created_at
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion count for monitoring
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % photo submissions older than % (cutoff: %)', 
      deleted_count, '2 months', cutoff_date;
  ELSE
    RAISE NOTICE 'No photo submissions to delete (cutoff: %)', cutoff_date;
  END IF;
END;
$$;

-- Grant necessary permissions for the storage deletion to work
-- The function runs as SECURITY DEFINER so it has the necessary permissions
