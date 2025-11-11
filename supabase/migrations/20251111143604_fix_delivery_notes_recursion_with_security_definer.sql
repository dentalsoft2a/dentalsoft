/*
  # Fix Infinite Recursion in delivery_notes RLS Policies (Part 2)

  ## Problem
  The recursion happens because many tables (work_assignments, production_tasks, etc.) 
  have policies that SELECT from delivery_notes, which in turn has policies that SELECT 
  from work_assignments. This creates a circular dependency.

  ## Solution
  Use SECURITY DEFINER functions to break the recursion chain. These functions run with
  the privileges of the function owner (bypassing RLS) to check ownership without 
  triggering recursive policy checks.

  ## Changes
  1. Create helper functions with SECURITY DEFINER to check delivery_note ownership
  2. Update policies on related tables to use these functions instead of direct JOINs
*/

-- Drop existing helper function if it exists
DROP FUNCTION IF EXISTS user_owns_delivery_note(uuid);

-- Create a SECURITY DEFINER function to check if user owns a delivery note
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION user_owns_delivery_note(p_delivery_note_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM delivery_notes 
    WHERE id = p_delivery_note_id 
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to check if user is an employee of the delivery note's laboratory
CREATE OR REPLACE FUNCTION user_is_laboratory_employee(p_delivery_note_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM delivery_notes dn
    INNER JOIN laboratory_employees le 
      ON le.laboratory_profile_id = dn.user_id
    WHERE dn.id = p_delivery_note_id 
      AND le.user_profile_id = auth.uid()
      AND le.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update work_assignments policies to use the helper function
DROP POLICY IF EXISTS "Users can view work assignments" ON work_assignments;
CREATE POLICY "Users can view work assignments"
  ON work_assignments FOR SELECT
  TO authenticated
  USING (
    user_owns_delivery_note(delivery_note_id) 
    OR user_is_laboratory_employee(delivery_note_id)
  );

DROP POLICY IF EXISTS "Users can delete work assignments" ON work_assignments;
CREATE POLICY "Users can delete work assignments"
  ON work_assignments FOR DELETE
  TO authenticated
  USING (
    user_owns_delivery_note(delivery_note_id)
    OR user_is_laboratory_employee(delivery_note_id)
  );

-- Update work_comments policies
DROP POLICY IF EXISTS "Users can view work comments" ON work_comments;
CREATE POLICY "Users can view work comments"
  ON work_comments FOR SELECT
  TO authenticated
  USING (
    user_owns_delivery_note(delivery_note_id)
    OR user_is_laboratory_employee(delivery_note_id)
  );

-- Update delivery_note_stages policies
DROP POLICY IF EXISTS "Users can view delivery note stages" ON delivery_note_stages;
CREATE POLICY "Users can view delivery note stages"
  ON delivery_note_stages FOR SELECT
  TO authenticated
  USING (
    user_owns_delivery_note(delivery_note_id)
    OR user_is_laboratory_employee(delivery_note_id)
  );

DROP POLICY IF EXISTS "Users can update delivery note stages" ON delivery_note_stages;
CREATE POLICY "Users can update delivery note stages"
  ON delivery_note_stages FOR UPDATE
  TO authenticated
  USING (
    user_owns_delivery_note(delivery_note_id)
    OR user_is_laboratory_employee(delivery_note_id)
  )
  WITH CHECK (
    user_owns_delivery_note(delivery_note_id)
    OR user_is_laboratory_employee(delivery_note_id)
  );

DROP POLICY IF EXISTS "Users can delete delivery note stages" ON delivery_note_stages;
CREATE POLICY "Users can delete delivery note stages"
  ON delivery_note_stages FOR DELETE
  TO authenticated
  USING (
    user_owns_delivery_note(delivery_note_id)
    OR user_is_laboratory_employee(delivery_note_id)
  );

-- Update production_tasks policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs tâches" ON production_tasks;
CREATE POLICY "Les utilisateurs peuvent voir leurs tâches"
  ON production_tasks FOR SELECT
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id));

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs tâches" ON production_tasks;
CREATE POLICY "Les utilisateurs peuvent modifier leurs tâches"
  ON production_tasks FOR UPDATE
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id))
  WITH CHECK (user_owns_delivery_note(delivery_note_id));

DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs tâches" ON production_tasks;
CREATE POLICY "Les utilisateurs peuvent supprimer leurs tâches"
  ON production_tasks FOR DELETE
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id));

-- Update production_notes policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs notes" ON production_notes;
CREATE POLICY "Les utilisateurs peuvent voir leurs notes"
  ON production_notes FOR SELECT
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id));

-- Update production_photos policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs photos" ON production_photos;
CREATE POLICY "Les utilisateurs peuvent voir leurs photos"
  ON production_photos FOR SELECT
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id));

DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs photos" ON production_photos;
CREATE POLICY "Les utilisateurs peuvent supprimer leurs photos"
  ON production_photos FOR DELETE
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id));

-- Update task_assignments policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs affectations" ON task_assignments;
CREATE POLICY "Les utilisateurs peuvent voir leurs affectations"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id));

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs affectations" ON task_assignments;
CREATE POLICY "Les utilisateurs peuvent modifier leurs affectations"
  ON task_assignments FOR UPDATE
  TO authenticated
  USING (user_owns_delivery_note(delivery_note_id))
  WITH CHECK (user_owns_delivery_note(delivery_note_id));

-- Update production_time_logs policy (it references production_tasks)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs journaux de temps" ON production_time_logs;
CREATE POLICY "Les utilisateurs peuvent voir leurs journaux de temps"
  ON production_time_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM production_tasks pt
      WHERE pt.id = production_time_logs.task_id
        AND user_owns_delivery_note(pt.delivery_note_id)
    )
  );

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs journaux de temps" ON production_time_logs;
CREATE POLICY "Les utilisateurs peuvent modifier leurs journaux de temps"
  ON production_time_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM production_tasks pt
      WHERE pt.id = production_time_logs.task_id
        AND user_owns_delivery_note(pt.delivery_note_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM production_tasks pt
      WHERE pt.id = production_time_logs.task_id
        AND user_owns_delivery_note(pt.delivery_note_id)
    )
  );

-- Add index to improve performance of the helper functions
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_id ON delivery_notes(user_id);

-- Add comments
COMMENT ON FUNCTION user_owns_delivery_note IS 'SECURITY DEFINER function to check delivery note ownership without triggering RLS recursion';
COMMENT ON FUNCTION user_is_laboratory_employee IS 'SECURITY DEFINER function to check if user is an employee of the delivery notes laboratory without triggering RLS recursion';
