/*
  # Allow laboratories to view dentist accounts who submitted photos

  1. Changes
    - Add RLS policy to allow laboratories to view dentist accounts information
      when the dentist has submitted photos to them
    - This enables the JOIN in photo_submissions to work properly for laboratory users

  2. Security
    - Laboratories can ONLY see dentist information for dentists who have submitted photos to them
    - No access to other dentists' information
*/

-- Allow laboratories to view dentist accounts who submitted photos to them
CREATE POLICY "Laboratories can view dentists who submitted to them"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photo_submissions
      WHERE photo_submissions.dentist_id = dentist_accounts.id
      AND photo_submissions.laboratory_id = auth.uid()
    )
  );
