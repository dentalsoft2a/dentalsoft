/*
  # Fix Employee Stage Filtering with Mixed ID Types

  1. Problem
    - allowed_stages contains BOTH default TEXT IDs (stage-production) AND UUIDs
    - Current RLS policy only checks UUID matches, ignoring TEXT IDs
    - Result: Employees only see stages matching UUIDs, missing TEXT IDs
    
  2. Solution
    - Enhanced helper function to get employee allowed stage names
    - Convert BOTH UUID stages AND default TEXT stages to stage names
    - Update RLS policies to match by stage names properly
    - Handle case-insensitive matching
    
  3. Security
    - Employees can ONLY see delivery notes at their authorized stages
    - Strict filtering based on stage names (from both UUID and TEXT IDs)
    - Laboratory owners maintain full access
*/

-- Enhanced helper function to get employee's allowed stage names (not just IDs)
CREATE OR REPLACE FUNCTION get_employee_allowed_stage_names(p_user_id uuid)
RETURNS TEXT[] AS $$
DECLARE
  v_allowed_stage_ids jsonb;
  v_allowed_stage_names TEXT[];
  v_laboratory_id uuid;
  v_role_name text;
  v_can_edit_all_stages boolean;
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
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Get role permissions
  SELECT 
    COALESCE((permissions->'work_management'->>'can_edit_all_stages')::boolean, false),
    COALESCE(permissions->'work_management'->'allowed_stages', '[]'::jsonb)
  INTO v_can_edit_all_stages, v_allowed_stage_ids
  FROM laboratory_role_permissions
  WHERE laboratory_profile_id = v_laboratory_id
    AND role_name = v_role_name;

  -- If can edit all stages, return all stage names for this laboratory
  IF v_can_edit_all_stages THEN
    SELECT ARRAY_AGG(LOWER(ps.name))
    INTO v_allowed_stage_names
    FROM production_stages ps
    WHERE ps.user_id = v_laboratory_id;
    
    RETURN COALESCE(v_allowed_stage_names, ARRAY[]::TEXT[]);
  END IF;

  -- Otherwise, convert allowed_stage_ids (mix of TEXT and UUID) to stage names
  WITH stage_ids AS (
    SELECT jsonb_array_elements_text(v_allowed_stage_ids) as stage_id
  ),
  stage_names_from_uuids AS (
    -- Get stage names from UUID matches in production_stages
    SELECT LOWER(ps.name) as stage_name
    FROM stage_ids si
    INNER JOIN production_stages ps ON ps.id::text = si.stage_id
    WHERE ps.user_id = v_laboratory_id
  ),
  stage_names_from_text AS (
    -- Convert default TEXT IDs to stage names
    SELECT LOWER(
      CASE si.stage_id
        WHEN 'stage-reception' THEN 'réception'
        WHEN 'stage-modelisation' THEN 'modélisation'
        WHEN 'stage-production' THEN 'production'
        WHEN 'stage-finition' THEN 'finition'
        WHEN 'stage-controle' THEN 'contrôle qualité'
        WHEN 'stage-livraison' THEN 'prêt à livrer'
        ELSE NULL
      END
    ) as stage_name
    FROM stage_ids si
    WHERE si.stage_id LIKE 'stage-%'
  )
  SELECT ARRAY_AGG(DISTINCT stage_name)
  INTO v_allowed_stage_names
  FROM (
    SELECT stage_name FROM stage_names_from_uuids
    UNION
    SELECT stage_name FROM stage_names_from_text WHERE stage_name IS NOT NULL
  ) combined;

  RETURN COALESCE(v_allowed_stage_names, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing employee policies on delivery_notes
DROP POLICY IF EXISTS "Employees can view delivery notes at allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view assigned delivery notes at allowed stages" ON delivery_notes;

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
          LOWER(get_stage_name_from_default_id(delivery_notes.current_stage_id)) = ANY(get_employee_allowed_stage_names(auth.uid()))
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
          LOWER(get_stage_name_from_default_id(delivery_notes.current_stage_id)) = ANY(get_employee_allowed_stage_names(auth.uid()))
        )
    )
  );

-- Add comments
COMMENT ON FUNCTION get_employee_allowed_stage_names IS 
  'Returns lowercase stage names from employee allowed_stages (handles both UUID and TEXT default IDs)';

COMMENT ON POLICY "Employees can view delivery notes at allowed stages" ON delivery_notes IS 
  'Employees with view_all_works can see delivery notes ONLY at stages in their allowed_stages (supports mixed UUID and TEXT IDs)';

COMMENT ON POLICY "Employees can view assigned delivery notes at allowed stages" ON delivery_notes IS 
  'Employees with view_assigned_only can see assigned delivery notes ONLY at stages in their allowed_stages (supports mixed UUID and TEXT IDs)';
