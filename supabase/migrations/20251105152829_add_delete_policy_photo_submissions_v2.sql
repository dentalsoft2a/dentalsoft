/*
  # Add delete policy for photo submissions

  1. Changes
    - Add RLS policy to allow laboratories to delete photo submissions sent to them
    - Add RLS policy to allow employees with photo access to delete submissions

  2. Security
    - Only laboratory owners can delete submissions sent to them
    - Only active employees with photo menu access can delete submissions
*/

-- Laboratory owners can delete photo submissions sent to them
CREATE POLICY "Laboratories can delete submissions sent to them"
  ON photo_submissions FOR DELETE
  TO authenticated
  USING (auth.uid() = laboratory_id);

-- Laboratory employees can delete photo submissions sent to their lab (if they have photo access)
CREATE POLICY "Employees can delete submissions sent to their lab"
  ON photo_submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees le
      JOIN laboratory_role_permissions lrp ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
      AND le.laboratory_profile_id = photo_submissions.laboratory_id
      AND le.is_active = true
      AND (lrp.menu_access->>'photos' = 'true' OR lrp.menu_access = '{}'::jsonb)
    )
  );
