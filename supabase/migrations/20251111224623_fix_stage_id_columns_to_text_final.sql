/*
  # Correction des colonnes stage_id pour utiliser TEXT au lieu de UUID

  Conversion finale des colonnes stage_id et current_stage_id de UUID vers TEXT
*/

-- Supprimer TOUTES les politiques RLS
DROP POLICY IF EXISTS "Employees can view assigned delivery notes in allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view delivery notes in allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can update delivery notes in allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can insert laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can update laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can delete laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can view own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can insert own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can update own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can delete own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Dentists can view their delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Dentists can create orders if allowed" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view stages in allowed stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can insert stages in allowed stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update stages in allowed stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can view stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can insert stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can view delivery note stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can insert delivery note stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can update delivery note stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can delete delivery note stages" ON delivery_note_stages;

-- Nettoyer les données
UPDATE delivery_notes SET current_stage_id = NULL;
DELETE FROM delivery_note_stages;

-- Modifier les types de colonnes
ALTER TABLE delivery_note_stages ALTER COLUMN stage_id TYPE TEXT;
ALTER TABLE delivery_notes ALTER COLUMN current_stage_id TYPE TEXT;

-- Ajouter des contraintes CHECK
ALTER TABLE delivery_note_stages 
ADD CONSTRAINT delivery_note_stages_stage_id_check 
CHECK (stage_id IN ('reception', 'modelisation', 'production', 'finition', 'controle', 'pret'));

ALTER TABLE delivery_notes 
ADD CONSTRAINT delivery_notes_current_stage_id_check 
CHECK (current_stage_id IS NULL OR current_stage_id IN ('reception', 'modelisation', 'production', 'finition', 'controle', 'pret'));

-- Recréer les politiques RLS principales

-- Propriétaires de laboratoire
CREATE POLICY "Users can view own delivery notes"
  ON delivery_notes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own delivery notes"
  ON delivery_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own delivery notes"
  ON delivery_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own delivery notes"
  ON delivery_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Employés
CREATE POLICY "Employees can view delivery notes in allowed stages"
  ON delivery_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR current_stage_id IS NULL 
          OR current_stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  );

CREATE POLICY "Employees can insert laboratory delivery notes"
  ON delivery_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  );

CREATE POLICY "Employees can update laboratory delivery notes"
  ON delivery_notes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR current_stage_id IS NULL 
          OR current_stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR current_stage_id IS NULL 
          OR current_stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  );

CREATE POLICY "Employees can delete laboratory delivery notes"
  ON delivery_notes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  );

-- delivery_note_stages - Propriétaires
CREATE POLICY "Users can view delivery note stages"
  ON delivery_note_stages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert delivery note stages"
  ON delivery_note_stages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update delivery note stages"
  ON delivery_note_stages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete delivery note stages"
  ON delivery_note_stages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

-- delivery_note_stages - Employés
CREATE POLICY "Employees can view stages"
  ON delivery_note_stages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  );

CREATE POLICY "Employees can insert stages"
  ON delivery_note_stages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  );

CREATE POLICY "Employees can update stages"
  ON delivery_note_stages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN laboratory_role_permissions perms 
        ON perms.laboratory_profile_id = emp.laboratory_profile_id 
        AND perms.role_name = emp.role_name
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
        AND (
          (perms.permissions->'work_management'->>'can_edit_all_stages')::boolean = true
          OR stage_id = ANY(ARRAY(SELECT jsonb_array_elements_text(perms.permissions->'work_management'->'allowed_stages')))
        )
    )
  );

-- Créer des index
CREATE INDEX IF NOT EXISTS idx_delivery_notes_current_stage 
  ON delivery_notes(current_stage_id) WHERE current_stage_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_note_stages_stage 
  ON delivery_note_stages(stage_id);
