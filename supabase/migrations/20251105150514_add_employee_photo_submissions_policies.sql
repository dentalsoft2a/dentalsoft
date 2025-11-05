/*
  # Allow employees to access their laboratory's photo submissions

  1. Changes
    - Add policy to allow employees to view photo submissions sent to their laboratory
    - Add policy to allow employees to update photo submission status for their laboratory
  
  2. Security
    - Employee must have an active record in laboratory_employees table
    - Can only access submissions for their assigned laboratory
*/

CREATE POLICY "Employees can read their laboratory submissions"
  ON photo_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = photo_submissions.laboratory_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can update their laboratory submission status"
  ON photo_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = photo_submissions.laboratory_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = photo_submissions.laboratory_id
        AND laboratory_employees.is_active = true
    )
  );
