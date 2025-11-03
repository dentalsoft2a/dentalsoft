/*
  # Add Unique Code Per User Constraint
  
  1. Problem
    - Currently a user could use the same code multiple times
    - Need to prevent reuse of codes by the same user
    
  2. Solution
    - Create a new table to track code usage history
    - Add a unique constraint on (code_id, user_id)
    - This allows multiple users to use the same code
    - But prevents one user from using it twice
    
  3. Changes
    - Create `access_code_usage` table
    - Add policies for the new table
    - Update the redeem logic will check this table
*/

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS access_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  -- Ensure one user can only use each code once
  UNIQUE(access_code_id, user_id)
);

-- Enable RLS
ALTER TABLE access_code_usage ENABLE ROW LEVEL SECURITY;

-- Policies for access_code_usage
CREATE POLICY "Users can view their own code usage"
  ON access_code_usage FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert their own usage records"
  ON access_code_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_code_usage_user 
  ON access_code_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_access_code_usage_code 
  ON access_code_usage(access_code_id);
