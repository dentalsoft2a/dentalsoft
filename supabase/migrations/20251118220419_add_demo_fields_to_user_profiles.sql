/*
  # Add Demo Account Fields to User Profiles

  ## Changes
  Add columns to track demo accounts in the user_profiles table:
  - `is_demo_account` (boolean) - Marks demo accounts
  - `demo_session_id` (uuid) - Links to the demo session

  ## Security
  No RLS changes needed - existing policies apply
*/

-- Add is_demo_account column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_demo_account'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_demo_account boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add demo_session_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'demo_session_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN demo_session_id uuid;
  END IF;
END $$;

-- Create index for quick demo account lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_demo_account 
  ON user_profiles(is_demo_account) 
  WHERE is_demo_account = true;
