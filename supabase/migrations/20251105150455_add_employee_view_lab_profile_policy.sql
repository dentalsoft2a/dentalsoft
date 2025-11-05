/*
  # Allow employees to view their laboratory's profile

  1. Changes
    - Add policy to allow employees to view their laboratory's user_profile
    - This enables employees to inherit subscription status from their laboratory
  
  2. Security
    - Employee must have an active record in laboratory_employees table
    - Can only view the profile of their assigned laboratory
*/

CREATE POLICY "Employees can view their laboratory profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = user_profiles.id
        AND laboratory_employees.is_active = true
    )
  );
