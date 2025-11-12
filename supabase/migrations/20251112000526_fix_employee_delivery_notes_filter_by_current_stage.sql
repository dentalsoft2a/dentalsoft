/*
  # Fix Employee Delivery Notes Filtering by Current Stage

  1. Problem
    - Employees can currently see ALL delivery notes of their laboratory
    - They should only see delivery notes that are at stages they have access to
    - Example: Employee with access to "Modélisation" and "Production" should NOT see 
      delivery notes at "Finition" stage

  2. Solution
    - Update RLS policies to filter by current_stage_id
    - Check if current_stage_id is in employee's allowed_stages array
    - Keep view_all_works logic but add stage filtering
    - Keep view_assigned_only logic with stage filtering

  3. Security
    - Employees can only view delivery notes at their authorized stages
    - Laboratory owners maintain full access
    - Super admins have complete access
*/

-- Drop existing employee policies on delivery_notes
DROP POLICY IF EXISTS "Employees can view all laboratory delivery notes with permission" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view assigned delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view laboratory delivery notes" ON delivery_notes;

-- Recreate policy: Employees can view delivery notes at their allowed stages (view_all_works = true)
CREATE POLICY "Employees can view delivery notes at allowed stages"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      INNER JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND delivery_notes.user_id = le.laboratory_profile_id
        AND COALESCE((lrp.permissions->'work_management'->>'view_all_works')::boolean, false) = true
        -- Check if current stage is in allowed stages OR can edit all stages
        AND (
          COALESCE((lrp.permissions->'work_management'->>'can_edit_all_stages')::boolean, false) = true
          OR delivery_notes.current_stage_id = ANY(
            SELECT jsonb_array_elements_text(lrp.permissions->'work_management'->'allowed_stages')::uuid
          )
        )
    )
  );

-- Recreate policy: Employees can view assigned delivery notes at their allowed stages (view_assigned_only = true)
CREATE POLICY "Employees can view assigned delivery notes at allowed stages"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      INNER JOIN work_assignments wa ON wa.employee_id = le.id
      INNER JOIN laboratory_role_permissions lrp 
        ON lrp.laboratory_profile_id = le.laboratory_profile_id
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND wa.delivery_note_id = delivery_notes.id
        AND COALESCE((lrp.permissions->'work_management'->>'view_assigned_only')::boolean, false) = true
        -- Check if current stage is in allowed stages OR can edit all stages
        AND (
          COALESCE((lrp.permissions->'work_management'->>'can_edit_all_stages')::boolean, false) = true
          OR delivery_notes.current_stage_id = ANY(
            SELECT jsonb_array_elements_text(lrp.permissions->'work_management'->'allowed_stages')::uuid
          )
        )
    )
  );

-- Add comment explaining the stage filtering
COMMENT ON POLICY "Employees can view delivery notes at allowed stages" ON delivery_notes IS 
  'Employees with view_all_works permission can see delivery notes only when they are at stages included in their allowed_stages array';

COMMENT ON POLICY "Employees can view assigned delivery notes at allowed stages" ON delivery_notes IS 
  'Employees with view_assigned_only permission can see assigned delivery notes only when they are at stages included in their allowed_stages array';
