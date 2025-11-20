/*
  # Fix Employee RLS Stage Filtering with Correct Type Matching

  1. Problem
    - current_stage_id in delivery_notes is TEXT (default stage IDs like "stage-finition")
    - allowed_stages in permissions contains UUIDs from production_stages table
    - The existing RLS policy tries to compare TEXT with UUID, which fails
    - Result: Employees see ALL delivery notes, filtering doesn't work

  2. Solution
    - Match stages by NAME instead of ID
    - Join production_stages to get the stage name from UUID
    - Compare stage name from current_stage_id with stage names from allowed_stages UUIDs
    - This bridges the gap between TEXT IDs and UUID IDs

  3. Security
    - Employees can ONLY see delivery notes at their authorized stages
    - Strict filtering based on stage names
    - Laboratory owners maintain full access
*/

-- Drop existing employee policies on delivery_notes
DROP POLICY IF EXISTS "Employees can view delivery notes at allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view assigned delivery notes at allowed stages" ON delivery_notes;

-- Helper function to get stage name from default stage ID
CREATE OR REPLACE FUNCTION get_stage_name_from_default_id(stage_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE stage_id
    WHEN 'stage-reception' THEN 'réception'
    WHEN 'stage-modelisation' THEN 'modélisation'
    WHEN 'stage-production' THEN 'production'
    WHEN 'stage-finition' THEN 'finition'
    WHEN 'stage-controle' THEN 'contrôle qualité'
    WHEN 'stage-livraison' THEN 'prêt à livrer'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recreate policy: Employees can view delivery notes at their allowed stages
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
        -- Check if current stage is in allowed stages
        AND (
          -- Can edit all stages = see everything
          COALESCE((lrp.permissions->'work_management'->>'can_edit_all_stages')::boolean, false) = true
          OR
          -- Compare stage names
          LOWER(get_stage_name_from_default_id(delivery_notes.current_stage_id)) IN (
            SELECT LOWER(ps.name)
            FROM production_stages ps
            WHERE ps.id::text = ANY(
              SELECT jsonb_array_elements_text(lrp.permissions->'work_management'->'allowed_stages')
            )
            AND ps.user_id = le.laboratory_profile_id
          )
        )
    )
  );

-- Recreate policy: Employees can view assigned delivery notes at their allowed stages
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
        -- Check if current stage is in allowed stages
        AND (
          -- Can edit all stages = see everything
          COALESCE((lrp.permissions->'work_management'->>'can_edit_all_stages')::boolean, false) = true
          OR
          -- Compare stage names
          LOWER(get_stage_name_from_default_id(delivery_notes.current_stage_id)) IN (
            SELECT LOWER(ps.name)
            FROM production_stages ps
            WHERE ps.id::text = ANY(
              SELECT jsonb_array_elements_text(lrp.permissions->'work_management'->'allowed_stages')
            )
            AND ps.user_id = le.laboratory_profile_id
          )
        )
    )
  );

-- Add comments
COMMENT ON FUNCTION get_stage_name_from_default_id IS 
  'Converts default stage IDs (like stage-finition) to stage names for RLS filtering';

COMMENT ON POLICY "Employees can view delivery notes at allowed stages" ON delivery_notes IS 
  'Employees with view_all_works can see delivery notes ONLY at stages in their allowed_stages (matched by name)';

COMMENT ON POLICY "Employees can view assigned delivery notes at allowed stages" ON delivery_notes IS 
  'Employees with view_assigned_only can see assigned delivery notes ONLY at stages in their allowed_stages (matched by name)';
