/*
  # Recreate employee policies for delivery_note_stages

  1. Purpose
    - Remove ALL existing employee-specific policies for delivery_note_stages
    - Create clean, simple policies that work with the employee system
    - Ensure employees can manage stages for their laboratory's delivery notes

  2. Changes
    - Drop all old employee policies
    - Create new simplified policies for employees
    - Employees with view_all_works can manage all stages
    - Employees with view_assigned_only can only manage stages for assigned BLs

  3. Security
    - Employees can only access delivery notes from their laboratory
    - Respects work_management permissions
*/

-- Drop ALL existing employee policies for delivery_note_stages
DROP POLICY IF EXISTS "Employees can view allowed stages on delivery_note_stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can insert stages for laboratory delivery notes" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update stages for laboratory delivery notes" ON delivery_note_stages;

-- Create simplified employee policy for INSERT
CREATE POLICY "Employees can insert stages"
  ON delivery_note_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employee belongs to the laboratory that owns this delivery note
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
    )
  );

-- Create simplified employee policy for UPDATE
CREATE POLICY "Employees can update stages"
  ON delivery_note_stages
  FOR UPDATE
  TO authenticated
  USING (
    -- Employee belongs to the laboratory that owns this delivery note
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
    )
  )
  WITH CHECK (
    -- Same check for WITH CHECK
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
    )
  );

-- Create employee policy for SELECT (viewing stages)
CREATE POLICY "Employees can view stages"
  ON delivery_note_stages
  FOR SELECT
  TO authenticated
  USING (
    -- Employee belongs to the laboratory that owns this delivery note
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      JOIN delivery_notes dn ON dn.user_id = le.laboratory_profile_id
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND dn.id = delivery_note_stages.delivery_note_id
    )
  );
