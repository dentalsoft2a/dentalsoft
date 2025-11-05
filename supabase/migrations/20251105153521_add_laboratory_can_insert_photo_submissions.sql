/*
  # Allow laboratories to insert photo submissions

  1. Changes
    - Add RLS policy to allow laboratories to insert photo submissions for any dentist
    - Add RLS policy to allow employees with photo access to insert submissions

  2. Security
    - Laboratory owners can insert submissions for their laboratory_id
    - Employees with photo access can insert submissions for their lab's laboratory_id
*/

-- Laboratories can insert photo submissions for their lab
CREATE POLICY "Laboratories can insert submissions for their lab"
  ON photo_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = laboratory_id);

-- Laboratory employees can insert photo submissions for their lab
CREATE POLICY "Employees can insert submissions for their lab"
  ON photo_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees le
      JOIN laboratory_role_permissions lrp ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
      AND le.laboratory_profile_id = laboratory_id
      AND le.is_active = true
      AND (lrp.menu_access->>'photos' = 'true' OR lrp.menu_access = '{}'::jsonb)
    )
  );
