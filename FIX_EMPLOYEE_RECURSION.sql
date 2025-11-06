-- Fix infinite recursion in laboratory_employees RLS policy
-- Execute this in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "laboratory_employees_all" ON laboratory_employees;
DROP POLICY IF EXISTS "laboratory_employees_owner_all" ON laboratory_employees;
DROP POLICY IF EXISTS "laboratory_employees_self_select" ON laboratory_employees;

-- Create simple non-recursive policies
-- Laboratory owners can manage their employees
CREATE POLICY "laboratory_employees_owner_all" 
  ON laboratory_employees 
  FOR ALL 
  TO authenticated 
  USING (laboratory_id = auth.uid())
  WITH CHECK (laboratory_id = auth.uid());

-- Employees can view their own record using auth.jwt()
CREATE POLICY "laboratory_employees_self_select" 
  ON laboratory_employees 
  FOR SELECT 
  TO authenticated 
  USING (
    email = auth.jwt()->>'email'
  );
