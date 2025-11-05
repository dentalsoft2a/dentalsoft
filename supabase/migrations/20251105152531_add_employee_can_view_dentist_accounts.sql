/*
  # Allow laboratory employees to view dentist accounts

  1. Changes
    - Add RLS policy to allow laboratory employees to view dentist accounts information
      when the dentist has submitted photos to their laboratory
    - This enables employees with photo access to see dentist names

  2. Security
    - Employees can ONLY see dentist information for dentists who have submitted photos to their laboratory
    - No access to other dentists' information
*/

-- Allow laboratory employees to view dentist accounts who submitted to their lab
CREATE POLICY "Employees can view dentists who submitted to their lab"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      JOIN photo_submissions ON photo_submissions.laboratory_id = laboratory_employees.laboratory_profile_id
      WHERE laboratory_employees.user_profile_id = auth.uid()
      AND laboratory_employees.is_active = true
      AND photo_submissions.dentist_id = dentist_accounts.id
    )
  );
