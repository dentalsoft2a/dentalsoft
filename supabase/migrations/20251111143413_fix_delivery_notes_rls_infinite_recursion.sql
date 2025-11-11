/*
  # Fix Infinite Recursion in delivery_notes RLS Policies

  ## Problem
  Multiple overlapping policies on delivery_notes table are causing infinite recursion.
  The policies for employees are creating circular dependencies.

  ## Solution
  1. Drop duplicate and conflicting employee policies
  2. Keep only the essential policies:
     - Owner policies (for laboratory owners)
     - New work_management policies (for employees with granular permissions)
  3. Remove the old generic employee policy that conflicts with the new ones

  ## Changes
  - Drop "Employees can view their laboratory delivery notes" (generic, causes conflicts)
  - Drop "Employees can manage their laboratory delivery notes" (too broad, causes conflicts)
  - Keep the new specific policies:
    - "Employees can view all laboratory delivery notes with permission"
    - "Employees can view assigned delivery notes"
  - Keep owner policies (Users can view/insert/update/delete own delivery notes)
*/

-- Drop the old conflicting employee policies
DROP POLICY IF EXISTS "Employees can view their laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can manage their laboratory delivery notes" ON delivery_notes;

-- Ensure we have clean, non-conflicting policies

-- Policy for laboratory owners to manage their delivery notes
-- These policies already exist and work fine, no changes needed

-- The new granular employee policies are already in place:
-- 1. "Employees can view all laboratory delivery notes with permission" 
--    (for employees with view_all_works = true)
-- 2. "Employees can view assigned delivery notes"
--    (for employees with view_assigned_only = true)

-- Add policies for employees to UPDATE and INSERT delivery notes
-- (they can only SELECT with the existing policies)

-- Employees can update delivery notes of their laboratory
CREATE POLICY "Employees can update laboratory delivery notes"
  ON delivery_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND le.laboratory_profile_id = delivery_notes.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND le.laboratory_profile_id = delivery_notes.user_id
    )
  );

-- Employees can insert delivery notes for their laboratory
CREATE POLICY "Employees can insert laboratory delivery notes"
  ON delivery_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND le.laboratory_profile_id = delivery_notes.user_id
    )
  );

-- Employees can delete delivery notes of their laboratory
CREATE POLICY "Employees can delete laboratory delivery notes"
  ON delivery_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.is_active = true
        AND le.laboratory_profile_id = delivery_notes.user_id
    )
  );

-- Add a comment to document the policy structure
COMMENT ON TABLE delivery_notes IS 'RLS Policies: Laboratory owners have full access via user_id. Employees have access based on work_management permissions (view_all_works or view_assigned_only) and can perform CRUD operations on their laboratory notes.';
