/*
  # Add Employee Work Permissions and Stage Access System

  ## Description
  This migration extends the employee management system to support granular work assignment
  permissions and stage-specific access control. It allows laboratories to control which
  employees can view all works or only assigned works, and which production stages each
  role can access and modify.

  ## New Features

  ### 1. Work Management Permissions
  Added to `laboratory_role_permissions.permissions` JSON field:
  - `work_management` object containing:
    - `view_all_works` (boolean): Can view all laboratory delivery notes
    - `view_assigned_only` (boolean): Can only view assigned delivery notes
    - `allowed_stages` (array of uuids): List of production stage IDs accessible
    - `can_edit_all_stages` (boolean): Can edit all stages or only allowed ones

  ### 2. Helper Functions
  - `get_employee_allowed_stages(p_user_id uuid)`: Returns array of stage IDs allowed for employee
  - `is_employee_assigned_to_delivery_note(p_user_id uuid, p_delivery_note_id uuid)`: Checks assignment
  - `can_employee_access_stage(p_user_id uuid, p_stage_id uuid)`: Verifies stage access

  ## Modified Tables

  ### delivery_notes
  No structural changes, but new RLS policies for employee access

  ### delivery_note_stages
  New RLS policies to restrict stage visibility and modification based on employee permissions

  ### work_assignments
  Enhanced policies to support multiple employee assignments per delivery note

  ## Security

  ### RLS Policies for Employees
  - Employees can view delivery notes they are assigned to (if view_assigned_only = true)
  - Employees can view all laboratory delivery notes (if view_all_works = true)
  - Employees can only view/edit stages present in their allowed_stages array
  - Laboratory owners maintain full unrestricted access
  - Super admins have complete access across all data

  ## Indexes
  - Composite index on work_assignments for faster assignment lookups
  - Index on laboratory_employees for user_id lookups

  ## Important Notes
  - Permissions are checked at database level via RLS, not just in UI
  - Multiple employees can be assigned to a single delivery note
  - Each employee sees only their authorized stages based on their role
  - Default permissions allow viewing all works and all stages for backward compatibility
*/

-- Create helper function to get employee's allowed stages
CREATE OR REPLACE FUNCTION get_employee_allowed_stages(p_user_id uuid)
RETURNS uuid[] AS $$
DECLARE
  v_allowed_stages uuid[];
  v_can_edit_all_stages boolean;
  v_role_name text;
  v_laboratory_id uuid;
BEGIN
  -- Get employee's role and laboratory
  SELECT le.role_name, le.laboratory_profile_id
  INTO v_role_name, v_laboratory_id
  FROM laboratory_employees le
  WHERE le.user_profile_id = p_user_id
    AND le.is_active = true
  LIMIT 1;

  -- If not an employee, return empty array
  IF v_role_name IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  -- Get role permissions
  SELECT 
    COALESCE((permissions->'work_management'->>'can_edit_all_stages')::boolean, true)
  INTO v_can_edit_all_stages
  FROM laboratory_role_permissions
  WHERE laboratory_profile_id = v_laboratory_id
    AND role_name = v_role_name;

  -- If can edit all stages, return all active stages for this laboratory
  IF v_can_edit_all_stages THEN
    SELECT ARRAY_AGG(ps.id)
    INTO v_allowed_stages
    FROM production_stages ps
    WHERE ps.user_id = v_laboratory_id;
    
    RETURN COALESCE(v_allowed_stages, ARRAY[]::uuid[]);
  END IF;

  -- Otherwise, return allowed stages from permissions
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(permissions->'work_management'->'allowed_stages')::uuid
  )
  INTO v_allowed_stages
  FROM laboratory_role_permissions
  WHERE laboratory_profile_id = v_laboratory_id
    AND role_name = v_role_name;

  RETURN COALESCE(v_allowed_stages, ARRAY[]::uuid[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if employee is assigned to delivery note
CREATE OR REPLACE FUNCTION is_employee_assigned_to_delivery_note(p_user_id uuid, p_delivery_note_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM work_assignments wa
    INNER JOIN laboratory_employees le ON le.id = wa.employee_id
    WHERE le.user_profile_id = p_user_id
      AND wa.delivery_note_id = p_delivery_note_id
      AND le.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if employee can access a specific stage
CREATE OR REPLACE FUNCTION can_employee_access_stage(p_user_id uuid, p_stage_id uuid)
RETURNS boolean AS $$
DECLARE
  v_allowed_stages uuid[];
BEGIN
  v_allowed_stages := get_employee_allowed_stages(p_user_id);
  
  -- Empty array means not an employee or no restrictions
  IF array_length(v_allowed_stages, 1) IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN p_stage_id = ANY(v_allowed_stages);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_assignments_composite 
  ON work_assignments(delivery_note_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_laboratory_employees_user_profile 
  ON laboratory_employees(user_profile_id) 
  WHERE is_active = true;

-- Add RLS policies for employees to view delivery notes

-- Employees can view delivery notes if they have view_all_works permission
CREATE POLICY "Employees can view all laboratory delivery notes with permission"
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
    )
  );

-- Employees can view assigned delivery notes if they have view_assigned_only permission
CREATE POLICY "Employees can view assigned delivery notes"
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
    )
  );

-- Add RLS policies for employees to access delivery_note_stages

-- Employees can view stages they have access to (for work_stages compatibility)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_note_stages') THEN
    EXECUTE 'CREATE POLICY "Employees can view allowed stages on delivery_note_stages"
      ON delivery_note_stages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM laboratory_employees le
          INNER JOIN work_assignments wa ON wa.employee_id = le.id
          INNER JOIN delivery_notes dn ON dn.id = wa.delivery_note_id
          WHERE le.user_profile_id = auth.uid()
            AND le.is_active = true
            AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            AND can_employee_access_stage(auth.uid(), delivery_note_stages.stage_id)
        )
      )';

    EXECUTE 'CREATE POLICY "Employees can update allowed stages on delivery_note_stages"
      ON delivery_note_stages FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM laboratory_employees le
          INNER JOIN work_assignments wa ON wa.employee_id = le.id
          WHERE le.user_profile_id = auth.uid()
            AND le.is_active = true
            AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            AND can_employee_access_stage(auth.uid(), delivery_note_stages.stage_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM laboratory_employees le
          INNER JOIN work_assignments wa ON wa.employee_id = le.id
          WHERE le.user_profile_id = auth.uid()
            AND le.is_active = true
            AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            AND can_employee_access_stage(auth.uid(), delivery_note_stages.stage_id)
        )
      )';

    EXECUTE 'CREATE POLICY "Employees can insert allowed stages on delivery_note_stages"
      ON delivery_note_stages FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM laboratory_employees le
          INNER JOIN work_assignments wa ON wa.employee_id = le.id
          WHERE le.user_profile_id = auth.uid()
            AND le.is_active = true
            AND wa.delivery_note_id = delivery_note_stages.delivery_note_id
            AND can_employee_access_stage(auth.uid(), delivery_note_stages.stage_id)
        )
      )';
  END IF;
END $$;

-- Add RLS policies for employees to access work_comments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_comments') THEN
    EXECUTE 'CREATE POLICY "Employees can view comments on assigned work"
      ON work_comments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM laboratory_employees le
          INNER JOIN work_assignments wa ON wa.employee_id = le.id
          WHERE le.user_profile_id = auth.uid()
            AND le.is_active = true
            AND wa.delivery_note_id = work_comments.delivery_note_id
        )
      )';

    EXECUTE 'CREATE POLICY "Employees can insert comments on assigned work"
      ON work_comments FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM laboratory_employees le
          INNER JOIN work_assignments wa ON wa.employee_id = le.id
          WHERE le.user_profile_id = auth.uid()
            AND le.is_active = true
            AND wa.delivery_note_id = work_comments.delivery_note_id
            AND auth.uid() = work_comments.user_id
        )
      )';
  END IF;
END $$;

-- Employees can view production stages of their laboratory
CREATE POLICY "Employees can view laboratory production stages"
  ON production_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND le.laboratory_profile_id = production_stages.user_id
    )
  );

-- Employees can view their own assignments
CREATE POLICY "Employees can view their work assignments"
  ON work_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND le.id = work_assignments.employee_id
    )
  );

-- Add default work_management permissions to existing roles
UPDATE laboratory_role_permissions
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{work_management}',
  jsonb_build_object(
    'view_all_works', true,
    'view_assigned_only', false,
    'allowed_stages', '[]'::jsonb,
    'can_edit_all_stages', true
  )
)
WHERE NOT (permissions ? 'work_management');

-- Create a comment explaining the permissions structure
COMMENT ON TABLE laboratory_role_permissions IS 'Stores role-based permissions for laboratory employees. The permissions field includes work_management: {view_all_works: boolean, view_assigned_only: boolean, allowed_stages: uuid[], can_edit_all_stages: boolean}';