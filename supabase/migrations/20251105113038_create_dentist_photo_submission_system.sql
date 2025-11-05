/*
  # Create Dentist Photo Submission System

  1. New Tables
    - `dentist_accounts`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - Stores dentist accounts who can submit photos (free accounts)
    
    - `photo_submissions`
      - `id` (uuid, primary key)
      - `dentist_id` (uuid, foreign key to dentist_accounts)
      - `laboratory_id` (uuid, foreign key to user_profiles)
      - `patient_name` (text)
      - `photo_url` (text)
      - `notes` (text, optional)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)
      - Stores photo submissions from dentists to laboratories

  2. Security
    - Enable RLS on both tables
    - Dentist accounts can read/update their own data
    - Dentist accounts can insert/read their own photo submissions
    - Laboratory users can read photo submissions sent to them
    - Super admins can access all data

  3. Storage
    - Create storage bucket for dentist photos
    - Set up appropriate access policies
*/

-- Create dentist_accounts table
CREATE TABLE IF NOT EXISTS dentist_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create photo_submissions table
CREATE TABLE IF NOT EXISTS photo_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid REFERENCES dentist_accounts(id) ON DELETE CASCADE NOT NULL,
  laboratory_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  patient_name text NOT NULL,
  photo_url text NOT NULL,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dentist_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dentist_accounts

-- Dentists can read their own account
CREATE POLICY "Dentists can read own account"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Dentists can update their own account
CREATE POLICY "Dentists can update own account"
  ON dentist_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow dentist account creation during signup
CREATE POLICY "Allow dentist signup"
  ON dentist_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Super admins can view all dentist accounts
CREATE POLICY "Super admins can view all dentist accounts"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for photo_submissions

-- Dentists can insert their own photo submissions
CREATE POLICY "Dentists can insert own submissions"
  ON photo_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = dentist_id);

-- Dentists can read their own photo submissions
CREATE POLICY "Dentists can read own submissions"
  ON photo_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = dentist_id);

-- Laboratories can read photo submissions sent to them
CREATE POLICY "Laboratories can read submissions sent to them"
  ON photo_submissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = laboratory_id
  );

-- Laboratories can update status of submissions sent to them
CREATE POLICY "Laboratories can update submission status"
  ON photo_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = laboratory_id)
  WITH CHECK (auth.uid() = laboratory_id);

-- Super admins can access all photo submissions
CREATE POLICY "Super admins can access all submissions"
  ON photo_submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Create storage bucket for dentist photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dentist-photos', 'dentist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dentist-photos bucket
CREATE POLICY "Authenticated users can upload dentist photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dentist-photos');

CREATE POLICY "Anyone can view dentist photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dentist-photos');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dentist-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dentist-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photo_submissions_dentist ON photo_submissions(dentist_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_laboratory ON photo_submissions(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_created ON photo_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dentist_accounts_email ON dentist_accounts(email);
