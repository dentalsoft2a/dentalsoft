/*
  # Add employee permissions for stage management

  1. Changes
    - Add policies to allow employees to insert/update delivery_note_stages for their laboratory
    - Allow employees to update delivery_notes (current_stage_id, progress_percentage, status)
    - Employees can manage stages for delivery notes they have view access to

  2. Security
    - Employees can only manage stages for delivery_notes in their laboratory
    - Respect work_management permissions (view_all_works or view_assigned_only)
*/

-- Drop restrictive employee policies for delivery_note_stages
DROP POLICY IF EXISTS "Employees can insert allowed stages on delivery_note_stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update allowed stages on delivery_note_stages" ON delivery_note_stages;

-- Create more flexible policies for employees to manage stages
CREATE POLICY "Employees can insert stages for laboratory delivery notes"
  ON delivery_note_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
        AND (
          -- Can manage stages if has view_all_works
          COALESCE((lrp.permissions->'work_management'->>'view_all_works')::boolean, false) = true
          OR
          -- Can manage stages if assigned to this delivery note
          (
            COALESCE((lrp.permissions->'work_management'->>'view_assigned_only')::boolean, false) = true
            AND EXISTS (
              SELECT 1 FROM work_assignments wa 
              WHERE wa.employee_id = le.id 
              AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            )
          )
        )
    )
  );

CREATE POLICY "Employees can update stages for laboratory delivery notes"
  ON delivery_note_stages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
        AND (
          COALESCE((lrp.permissions->'work_management'->>'view_all_works')::boolean, false) = true
          OR
          (
            COALESCE((lrp.permissions->'work_management'->>'view_assigned_only')::boolean, false) = true
            AND EXISTS (
              SELECT 1 FROM work_assignments wa 
              WHERE wa.employee_id = le.id 
              AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
        AND (
          COALESCE((lrp.permissions->'work_management'->>'view_all_works')::boolean, false) = true
          OR
          (
            COALESCE((lrp.permissions->'work_management'->>'view_assigned_only')::boolean, false) = true
            AND EXISTS (
              SELECT 1 FROM work_assignments wa 
              WHERE wa.employee_id = le.id 
              AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            )
          )
        )
    )
  );
