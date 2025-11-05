/*
  # Add Dentist Favorite Laboratories System

  1. New Tables
    - `dentist_favorite_laboratories`
      - `id` (uuid, primary key)
      - `dentist_id` (uuid, references dentist_accounts)
      - `laboratory_profile_id` (uuid, references profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `dentist_favorite_laboratories` table
    - Add policy for dentists to manage their own favorites

  3. Indexes
    - Index on (dentist_id, laboratory_profile_id) for quick lookups
*/

-- Create dentist favorite laboratories table
CREATE TABLE IF NOT EXISTS dentist_favorite_laboratories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid REFERENCES dentist_accounts(id) ON DELETE CASCADE NOT NULL,
  laboratory_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dentist_id, laboratory_profile_id)
);

-- Enable RLS
ALTER TABLE dentist_favorite_laboratories ENABLE ROW LEVEL SECURITY;

-- Dentists can view their own favorites
CREATE POLICY "Dentists can view own favorites"
  ON dentist_favorite_laboratories
  FOR SELECT
  TO authenticated
  USING (
    dentist_id IN (
      SELECT da.id 
      FROM dentist_accounts da
      JOIN auth.users u ON u.email = da.email
      WHERE u.id = auth.uid()
    )
  );

-- Dentists can add their own favorites
CREATE POLICY "Dentists can add own favorites"
  ON dentist_favorite_laboratories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dentist_id IN (
      SELECT da.id 
      FROM dentist_accounts da
      JOIN auth.users u ON u.email = da.email
      WHERE u.id = auth.uid()
    )
  );

-- Dentists can remove their own favorites
CREATE POLICY "Dentists can remove own favorites"
  ON dentist_favorite_laboratories
  FOR DELETE
  TO authenticated
  USING (
    dentist_id IN (
      SELECT da.id 
      FROM dentist_accounts da
      JOIN auth.users u ON u.email = da.email
      WHERE u.id = auth.uid()
    )
  );

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_dentist_favorites_dentist_id 
  ON dentist_favorite_laboratories(dentist_id);

CREATE INDEX IF NOT EXISTS idx_dentist_favorites_laboratory_id 
  ON dentist_favorite_laboratories(laboratory_profile_id);
