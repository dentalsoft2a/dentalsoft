/*
  # Fix Employee Delivery Notes Stage Filter

  1. Changes
    - Drop existing employee view policies for delivery_notes
    - Create new policies that filter delivery_notes based on allowed_stages from role permissions
    - Employees can only see delivery_notes in stages they are authorized to access
    - If employee has can_edit_all_stages = true, they see all delivery_notes
    - If employee has view_assigned_only = true, they only see assigned delivery_notes (existing behavior)
    - If employee has view_all_works = true but limited stages, they see all delivery_notes in their allowed stages

  2. Security
    - Restricts employee access to only authorized production stages
    - Maintains existing view_assigned_only behavior
    - Allows laboratory owners to see everything
*/

-- Drop existing employee policies that don't check stages
DROP POLICY IF EXISTS "Employees can view all laboratory delivery notes with permissio" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view assigned delivery notes" ON delivery_notes;

-- Create new policy: Employees can view delivery notes in allowed stages (view_all_works = true)
CREATE POLICY "Employees can view delivery notes in allowed stages"
  ON delivery_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND delivery_notes.user_id = le.laboratory_profile_id
        AND COALESCE((lrp.permissions->'work_management'->>'view_all_works')::boolean, false) = true
        AND (
          -- If can edit all stages, show everything
          COALESCE((lrp.permissions->'work_management'->>'can_edit_all_stages')::boolean, false) = true
          OR
          -- If limited stages, only show delivery_notes in allowed stages or without stage
          (
            delivery_notes.current_stage_id IS NULL
            OR
            delivery_notes.current_stage_id::text = ANY(
              SELECT jsonb_array_elements_text(lrp.permissions->'work_management'->'allowed_stages')
            )
          )
        )
    )
  );

-- Create new policy: Employees can view assigned delivery notes (view_assigned_only = true)
CREATE POLICY "Employees can view assigned delivery notes in allowed stages"
  ON delivery_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN work_assignments wa ON wa.employee_id = le.id
      JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND wa.delivery_note_id = delivery_notes.id
        AND COALESCE((lrp.permissions->'work_management'->>'view_assigned_only')::boolean, false) = true
        AND (
          -- If can edit all stages, show everything
          COALESCE((lrp.permissions->'work_management'->>'can_edit_all_stages')::boolean, false) = true
          OR
          -- If limited stages, only show delivery_notes in allowed stages or without stage
          (
            delivery_notes.current_stage_id IS NULL
            OR
            delivery_notes.current_stage_id::text = ANY(
              SELECT jsonb_array_elements_text(lrp.permissions->'work_management'->'allowed_stages')
            )
          )
        )
    )
  );
