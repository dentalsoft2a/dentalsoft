/*
  # Create DS-Core Integration System

  1. New Tables
    - `dscore_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `access_token` (text, encrypted)
      - `refresh_token` (text, encrypted)
      - `token_expiry` (timestamptz)
      - `is_connected` (boolean)
      - `last_sync_at` (timestamptz)
      - `auto_sync_enabled` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `dscore_dentist_mapping`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles - laboratory)
      - `dscore_dentist_id` (text, DS-Core dentist identifier)
      - `dscore_dentist_name` (text)
      - `dscore_dentist_email` (text)
      - `local_dentist_id` (uuid, foreign key to dentist_accounts, nullable)
      - `auto_created` (boolean, if local account was auto-created)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `dscore_sync_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `sync_type` (text: manual, automatic, scheduled)
      - `status` (text: success, partial, failed)
      - `files_retrieved` (integer)
      - `files_failed` (integer)
      - `error_message` (text, nullable)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Modifications to Existing Tables
    - Add `source` column to `photo_submissions` (dentist_app, dscore)
    - Add `dscore_id` column to `photo_submissions` (DS-Core file identifier)
    - Add `dscore_metadata` column to `photo_submissions` (jsonb, stores DS-Core metadata)

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated laboratory users to manage their DS-Core data
    - Restrict access to credentials to the owning user only
*/

-- Create dscore_credentials table
CREATE TABLE IF NOT EXISTS dscore_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  is_connected boolean DEFAULT false,
  last_sync_at timestamptz,
  auto_sync_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE dscore_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DS-Core credentials"
  ON dscore_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DS-Core credentials"
  ON dscore_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DS-Core credentials"
  ON dscore_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own DS-Core credentials"
  ON dscore_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create dscore_dentist_mapping table
CREATE TABLE IF NOT EXISTS dscore_dentist_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  dscore_dentist_id text NOT NULL,
  dscore_dentist_name text NOT NULL,
  dscore_dentist_email text,
  local_dentist_id uuid REFERENCES dentist_accounts(id) ON DELETE SET NULL,
  auto_created boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dscore_dentist_id)
);

ALTER TABLE dscore_dentist_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DS-Core dentist mappings"
  ON dscore_dentist_mapping FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DS-Core dentist mappings"
  ON dscore_dentist_mapping FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DS-Core dentist mappings"
  ON dscore_dentist_mapping FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own DS-Core dentist mappings"
  ON dscore_dentist_mapping FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create dscore_sync_log table
CREATE TABLE IF NOT EXISTS dscore_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  sync_type text NOT NULL CHECK (sync_type IN ('manual', 'automatic', 'scheduled')),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  files_retrieved integer DEFAULT 0,
  files_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dscore_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DS-Core sync logs"
  ON dscore_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DS-Core sync logs"
  ON dscore_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add DS-Core related columns to photo_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'source'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN source text DEFAULT 'dentist_app' CHECK (source IN ('dentist_app', 'dscore'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'dscore_id'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN dscore_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'dscore_metadata'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN dscore_metadata jsonb;
  END IF;
END $$;

-- Create index for faster DS-Core ID lookups
CREATE INDEX IF NOT EXISTS idx_photo_submissions_dscore_id ON photo_submissions(dscore_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_source ON photo_submissions(source);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dscore_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_dscore_credentials_updated_at ON dscore_credentials;
CREATE TRIGGER update_dscore_credentials_updated_at
  BEFORE UPDATE ON dscore_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_dscore_updated_at();

DROP TRIGGER IF EXISTS update_dscore_dentist_mapping_updated_at ON dscore_dentist_mapping;
CREATE TRIGGER update_dscore_dentist_mapping_updated_at
  BEFORE UPDATE ON dscore_dentist_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_dscore_updated_at();
