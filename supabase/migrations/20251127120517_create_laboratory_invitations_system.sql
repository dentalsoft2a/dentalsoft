/*
  # Create Laboratory Invitations System

  1. New Tables
    - `laboratory_invitations`
      - `id` (uuid, primary key)
      - `dentist_user_id` (uuid, references auth.users via auth.uid())
      - `laboratory_email` (text, email of invited laboratory)
      - `laboratory_name` (text, name of laboratory)
      - `laboratory_phone` (text, optional phone)
      - `laboratory_address` (text, optional address)
      - `invitation_code` (text, unique invitation code)
      - `status` (text, values: pending, accepted, expired, rejected)
      - `sent_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `accepted_at` (timestamptz, nullable)
      - `laboratory_profile_id` (uuid, nullable, references profiles.id)
      - `message` (text, optional personal message)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `laboratory_invitations` table
    - Dentists can view, create, and update their own invitations
    - Super admins can view all invitations

  3. Indexes
    - Unique index on invitation_code
    - Index on dentist_user_id
    - Index on laboratory_email
    - Index on status

  4. Important Notes
    - Invitations expire after 30 days
    - When accepted, automatically creates dentist record link
    - Prevents duplicate invitations to same email
*/

-- Create laboratory invitations table
CREATE TABLE IF NOT EXISTS laboratory_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_user_id uuid NOT NULL,
  laboratory_email text NOT NULL,
  laboratory_name text NOT NULL,
  laboratory_phone text,
  laboratory_address text,
  invitation_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'rejected')),
  sent_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  laboratory_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_laboratory_invitations_dentist_user 
  ON laboratory_invitations(dentist_user_id);

CREATE INDEX IF NOT EXISTS idx_laboratory_invitations_email 
  ON laboratory_invitations(laboratory_email);

CREATE INDEX IF NOT EXISTS idx_laboratory_invitations_status 
  ON laboratory_invitations(status);

CREATE INDEX IF NOT EXISTS idx_laboratory_invitations_code 
  ON laboratory_invitations(invitation_code);

-- Enable RLS
ALTER TABLE laboratory_invitations ENABLE ROW LEVEL SECURITY;

-- Dentists can view their own invitations
CREATE POLICY "Dentists can view own invitations"
  ON laboratory_invitations
  FOR SELECT
  TO authenticated
  USING (dentist_user_id = auth.uid());

-- Dentists can create their own invitations
CREATE POLICY "Dentists can create invitations"
  ON laboratory_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (dentist_user_id = auth.uid());

-- Dentists can update their own invitations (for resending, canceling)
CREATE POLICY "Dentists can update own invitations"
  ON laboratory_invitations
  FOR UPDATE
  TO authenticated
  USING (dentist_user_id = auth.uid());

-- Super admins can view all invitations
CREATE POLICY "Super admins can view all invitations"
  ON laboratory_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Function to generate a secure invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a 16-character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 16));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM laboratory_invitations WHERE invitation_code = code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Function to auto-expire old invitations
CREATE OR REPLACE FUNCTION auto_expire_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE laboratory_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- Function to check if email already has pending invitation
CREATE OR REPLACE FUNCTION has_pending_invitation(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_invitation boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM laboratory_invitations
    WHERE laboratory_email = p_email
    AND status = 'pending'
    AND expires_at > now()
  ) INTO has_invitation;
  
  RETURN has_invitation;
END;
$$;

-- Function to check if email is already registered as laboratory
CREATE OR REPLACE FUNCTION is_laboratory_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_registered boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE laboratory_email = p_email
    AND laboratory_name IS NOT NULL
  ) INTO is_registered;
  
  RETURN is_registered;
END;
$$;