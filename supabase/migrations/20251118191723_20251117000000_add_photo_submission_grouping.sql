/*
  # Add Photo Submission Grouping

  1. Changes to photo_submissions table
    - Add `submission_group_id` (uuid) - Links multiple photos from the same submission
    - Add `photo_sequence` (integer) - Order of the photo within the group (1-3)

  2. Purpose
    - Allow dentists to submit 1-3 photos in a single submission
    - Group related photos for better organization
    - Maintain sequence order for photos in the same submission

  3. Indexes
    - Create index on submission_group_id for efficient grouping queries
    - Create composite index on (submission_group_id, photo_sequence) for ordered retrieval
*/

-- Add submission_group_id column to group photos from the same submission
ALTER TABLE photo_submissions
ADD COLUMN IF NOT EXISTS submission_group_id uuid DEFAULT gen_random_uuid();

-- Add photo_sequence column to track the order of photos in a group (1-3)
ALTER TABLE photo_submissions
ADD COLUMN IF NOT EXISTS photo_sequence integer DEFAULT 1;

-- Add constraint to ensure photo_sequence is between 1 and 3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_photo_sequence_range'
  ) THEN
    ALTER TABLE photo_submissions
    ADD CONSTRAINT check_photo_sequence_range
    CHECK (photo_sequence >= 1 AND photo_sequence <= 3);
  END IF;
END $$;

-- Create index on submission_group_id for efficient grouping
CREATE INDEX IF NOT EXISTS idx_photo_submissions_group
ON photo_submissions(submission_group_id);

-- Create composite index for ordered retrieval within groups
CREATE INDEX IF NOT EXISTS idx_photo_submissions_group_sequence
ON photo_submissions(submission_group_id, photo_sequence);

-- Add comment explaining the new fields
COMMENT ON COLUMN photo_submissions.submission_group_id IS 'Groups multiple photos from the same submission session (1-3 photos max)';
COMMENT ON COLUMN photo_submissions.photo_sequence IS 'Sequence number of the photo within its group (1-3)';