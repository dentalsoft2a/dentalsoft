/*
  # Create missing DScore integration tables

  1. New Tables
    - `dscore_credentials`
      - `user_id` (uuid, primary key, foreign key to profiles)
      - `api_key` (text, encrypted API key)
      - `is_connected` (boolean, connection status)
      - `last_sync_at` (timestamptz, last sync timestamp)
      - `auto_sync_enabled` (boolean, auto sync setting)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `dscore_dentist_mapping`
      - `id` (uuid, primary key)
      - `laboratory_profile_id` (uuid, foreign key to profiles)
      - `dentist_account_id` (uuid, foreign key to dentist_accounts)
      - `dscore_dentist_id` (text, DScore dentist ID)
      - `dscore_dentist_name` (text, DScore dentist name)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `dscore_sync_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `sync_type` (text, type of sync)
      - `status` (text, sync status)
      - `files_retrieved` (integer, number of files)
      - `files_processed` (integer, number processed)
      - `errors` (jsonb, error details)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create dscore_credentials table
CREATE TABLE IF NOT EXISTS dscore_credentials (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  api_key text,
  is_connected boolean DEFAULT false,
  last_sync_at timestamptz,
  auto_sync_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dscore_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DScore credentials"
  ON dscore_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DScore credentials"
  ON dscore_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DScore credentials"
  ON dscore_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own DScore credentials"
  ON dscore_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create dscore_dentist_mapping table
CREATE TABLE IF NOT EXISTS dscore_dentist_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_account_id uuid REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  dscore_dentist_id text NOT NULL,
  dscore_dentist_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(laboratory_profile_id, dscore_dentist_id)
);

ALTER TABLE dscore_dentist_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DScore dentist mappings"
  ON dscore_dentist_mapping FOR SELECT
  TO authenticated
  USING (auth.uid() = laboratory_profile_id);

CREATE POLICY "Users can insert own DScore dentist mappings"
  ON dscore_dentist_mapping FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = laboratory_profile_id);

CREATE POLICY "Users can update own DScore dentist mappings"
  ON dscore_dentist_mapping FOR UPDATE
  TO authenticated
  USING (auth.uid() = laboratory_profile_id)
  WITH CHECK (auth.uid() = laboratory_profile_id);

CREATE POLICY "Users can delete own DScore dentist mappings"
  ON dscore_dentist_mapping FOR DELETE
  TO authenticated
  USING (auth.uid() = laboratory_profile_id);

-- Create dscore_sync_log table
CREATE TABLE IF NOT EXISTS dscore_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sync_type text DEFAULT 'manual',
  status text DEFAULT 'pending',
  files_retrieved integer DEFAULT 0,
  files_processed integer DEFAULT 0,
  errors jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dscore_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DScore sync logs"
  ON dscore_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DScore sync logs"
  ON dscore_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dscore_dentist_mapping_lab ON dscore_dentist_mapping(laboratory_profile_id);
CREATE INDEX IF NOT EXISTS idx_dscore_dentist_mapping_dentist ON dscore_dentist_mapping(dentist_account_id);
CREATE INDEX IF NOT EXISTS idx_dscore_sync_log_user ON dscore_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_dscore_sync_log_created ON dscore_sync_log(created_at DESC);
