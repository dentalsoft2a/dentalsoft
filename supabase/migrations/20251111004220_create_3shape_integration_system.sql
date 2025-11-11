/*
  # Create 3Shape Communicate Integration System

  1. New Tables
    - `threeshape_credentials`
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

    - `threeshape_dentist_mapping`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles - laboratory)
      - `threeshape_dentist_id` (text, 3Shape dentist identifier)
      - `threeshape_dentist_name` (text)
      - `threeshape_dentist_email` (text)
      - `local_dentist_id` (uuid, foreign key to dentist_accounts, nullable)
      - `auto_created` (boolean, if local account was auto-created)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `threeshape_sync_log`
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
    - Update `source` column check constraint in `photo_submissions` to include '3shape'
    - Add `threeshape_id` column to `photo_submissions` (3Shape file identifier)
    - Add `threeshape_metadata` column to `photo_submissions` (jsonb, stores 3Shape metadata)

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated laboratory users to manage their 3Shape data
    - Restrict access to credentials to the owning user only
*/

-- Create threeshape_credentials table
CREATE TABLE IF NOT EXISTS threeshape_credentials (
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

ALTER TABLE threeshape_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 3Shape credentials"
  ON threeshape_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 3Shape credentials"
  ON threeshape_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 3Shape credentials"
  ON threeshape_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 3Shape credentials"
  ON threeshape_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create threeshape_dentist_mapping table
CREATE TABLE IF NOT EXISTS threeshape_dentist_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  threeshape_dentist_id text NOT NULL,
  threeshape_dentist_name text NOT NULL,
  threeshape_dentist_email text,
  local_dentist_id uuid REFERENCES dentist_accounts(id) ON DELETE SET NULL,
  auto_created boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, threeshape_dentist_id)
);

ALTER TABLE threeshape_dentist_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 3Shape dentist mappings"
  ON threeshape_dentist_mapping FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 3Shape dentist mappings"
  ON threeshape_dentist_mapping FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 3Shape dentist mappings"
  ON threeshape_dentist_mapping FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 3Shape dentist mappings"
  ON threeshape_dentist_mapping FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create threeshape_sync_log table
CREATE TABLE IF NOT EXISTS threeshape_sync_log (
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

ALTER TABLE threeshape_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 3Shape sync logs"
  ON threeshape_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 3Shape sync logs"
  ON threeshape_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update photo_submissions to support 3Shape
DO $$
BEGIN
  -- First check if source column exists and add it if not
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'source'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN source text DEFAULT 'dentist_app';
  END IF;

  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'photo_submissions' AND constraint_name = 'photo_submissions_source_check'
  ) THEN
    ALTER TABLE photo_submissions DROP CONSTRAINT photo_submissions_source_check;
  END IF;

  -- Add new constraint with 3shape included
  ALTER TABLE photo_submissions ADD CONSTRAINT photo_submissions_source_check 
    CHECK (source IN ('dentist_app', 'dscore', '3shape'));

  -- Add 3Shape related columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'threeshape_id'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN threeshape_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_submissions' AND column_name = 'threeshape_metadata'
  ) THEN
    ALTER TABLE photo_submissions ADD COLUMN threeshape_metadata jsonb;
  END IF;
END $$;

-- Create indexes for faster 3Shape ID lookups
CREATE INDEX IF NOT EXISTS idx_photo_submissions_threeshape_id ON photo_submissions(threeshape_id);

-- Create function to update updated_at timestamp for 3Shape tables
CREATE OR REPLACE FUNCTION update_threeshape_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_threeshape_credentials_updated_at ON threeshape_credentials;
CREATE TRIGGER update_threeshape_credentials_updated_at
  BEFORE UPDATE ON threeshape_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_threeshape_updated_at();

DROP TRIGGER IF EXISTS update_threeshape_dentist_mapping_updated_at ON threeshape_dentist_mapping;
CREATE TRIGGER update_threeshape_dentist_mapping_updated_at
  BEFORE UPDATE ON threeshape_dentist_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_threeshape_updated_at();
