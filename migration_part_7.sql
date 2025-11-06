-- ============================================
-- PARTIE 7/10 - Migrations 49 à 56
-- ============================================

-- ============================================
-- Migration: 20251102200322_add_unique_code_per_user_constraint.sql
-- ============================================

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


-- ============================================
-- Migration: 20251102200815_create_credit_notes_system.sql
-- ============================================

/*
  # Création du système d'avoirs (credit notes)

  1. Nouvelle table
    - `credit_notes`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence à profiles)
      - `invoice_id` (uuid, référence à invoices)
      - `credit_note_number` (text, unique, numéro de l'avoir)
      - `date` (date, date de création de l'avoir)
      - `reason` (text, raison de l'avoir)
      - `subtotal` (decimal, sous-total)
      - `tax_rate` (decimal, taux de TVA)
      - `tax_amount` (decimal, montant TVA)
      - `total` (decimal, montant total de l'avoir)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Table de liaison pour les articles d'avoir
    - `credit_note_items`
      - `id` (uuid, clé primaire)
      - `credit_note_id` (uuid, référence à credit_notes)
      - `description` (text, description de l'article)
      - `quantity` (decimal, quantité)
      - `unit_price` (decimal, prix unitaire)
      - `total` (decimal, montant total de la ligne)

  3. Sécurité
    - Enable RLS sur les deux tables
    - Politiques pour que les utilisateurs ne voient que leurs propres avoirs

  4. Trigger
    - Mise à jour automatique de updated_at
*/

-- Table des avoirs
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  credit_note_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(10, 2) NOT NULL DEFAULT 20,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des articles d'avoir
CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity decimal(10, 2) NOT NULL DEFAULT 1,
  unit_price decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

-- Policies pour credit_notes
CREATE POLICY "Users can view own credit notes"
  ON credit_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own credit notes"
  ON credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own credit notes"
  ON credit_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own credit notes"
  ON credit_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies pour credit_note_items
CREATE POLICY "Users can view own credit note items"
  ON credit_note_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own credit note items"
  ON credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own credit note items"
  ON credit_note_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own credit note items"
  ON credit_note_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

-- Fonction pour updated_at si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_credit_notes_user_id ON credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);


-- ============================================
-- Migration: 20251102220300_update_credit_notes_link_to_dentist_v2.sql
-- ============================================

/*
  # Modifier les avoirs pour les lier au dentiste

  1. Changements
    - Ajouter la colonne `dentist_id` dans `credit_notes`
    - Copier les dentist_id depuis les factures existantes
    - Supprimer la colonne `invoice_id`
    - Ajouter la colonne `used` pour marquer les avoirs utilisés
    - Mettre à jour les politiques RLS

  2. Notes
    - Les avoirs seront maintenant liés aux dentistes
    - Lors de la génération d'une facture, les avoirs disponibles seront appliqués automatiquement
*/

-- Ajouter la nouvelle colonne dentist_id (nullable temporairement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'dentist_id'
  ) THEN
    ALTER TABLE credit_notes ADD COLUMN dentist_id uuid REFERENCES dentists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Copier les dentist_id depuis les factures existantes
UPDATE credit_notes
SET dentist_id = invoices.dentist_id
FROM invoices
WHERE credit_notes.invoice_id = invoices.id
  AND credit_notes.dentist_id IS NULL;

-- Rendre dentist_id obligatoire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' 
    AND column_name = 'dentist_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE credit_notes ALTER COLUMN dentist_id SET NOT NULL;
  END IF;
END $$;

-- Supprimer l'ancienne contrainte et colonne
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credit_notes_invoice_id_fkey'
    AND table_name = 'credit_notes'
  ) THEN
    ALTER TABLE credit_notes DROP CONSTRAINT credit_notes_invoice_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE credit_notes DROP COLUMN invoice_id;
  END IF;
END $$;

-- Ajouter la colonne used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'used'
  ) THEN
    ALTER TABLE credit_notes ADD COLUMN used boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_credit_notes_dentist_id ON credit_notes(dentist_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_used ON credit_notes(used);

-- ============================================
-- Migration: 20251104165627_fix_duplicate_triggers_signup.sql
-- ============================================

/*
  # Fix Duplicate Triggers Causing 500 Error on Signup

  1. Problem
    - Two triggers on profiles table both try to create user_profiles
    - `create_user_profile_trigger` calls `create_user_profile_on_signup()`
    - `on_profile_created` calls `create_user_profile_on_profile_insert()`
    - This causes conflicts and 500 errors during signup
  
  2. Solution
    - Keep only ONE trigger: `create_user_profile_trigger`
    - Drop the duplicate trigger `on_profile_created`
    - Drop the unused function `create_user_profile_on_profile_insert()`
    - Ensure the remaining function works correctly with SECURITY DEFINER
  
  3. Final Flow
    - User signs up → auth.users entry created
    - App inserts into profiles table
    - Single trigger creates user_profiles entry
    - RLS allows trigger to bypass restrictions via SECURITY DEFINER
*/

-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Drop the unused function
DROP FUNCTION IF EXISTS create_user_profile_on_profile_insert();

-- Ensure the correct function exists and is properly configured
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Insert into user_profiles with elevated privileges
  INSERT INTO public.user_profiles (
    id,
    email,
    role,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    trial_used
  ) VALUES (
    NEW.id,
    user_email,
    'user',
    'trial',
    now(),
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Error creating user_profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();


-- ============================================
-- Migration: 20251105080539_create_smtp_settings.sql
-- ============================================

/*
  # SMTP Settings Configuration for Super Admin

  1. New Tables
    - `smtp_settings`
      - `id` (uuid, primary key)
      - `configured_by` (uuid, references auth.users) - Super admin who configured
      - `smtp_host` (text) - SMTP server host
      - `smtp_port` (integer) - SMTP server port
      - `smtp_secure` (boolean) - Use TLS/SSL
      - `smtp_user` (text) - SMTP username
      - `smtp_password` (text) - SMTP password (encrypted)
      - `from_email` (text) - Default sender email
      - `from_name` (text) - Default sender name
      - `is_active` (boolean) - Active configuration
      - `test_email_sent` (boolean) - Test email status
      - `last_tested_at` (timestamptz) - Last test timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `smtp_settings` table
    - Only super admins can read/write SMTP settings
    - Ensure only one active configuration at a time

  3. Important Notes
    - SMTP passwords should be encrypted in production
    - Only super admins have access to this table
    - System-wide settings, not per-user
*/

-- Create smtp_settings table
CREATE TABLE IF NOT EXISTS smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean DEFAULT true,
  smtp_user text NOT NULL,
  smtp_password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'GB Dental',
  is_active boolean DEFAULT true,
  test_email_sent boolean DEFAULT false,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view SMTP settings
CREATE POLICY "Super admins can view SMTP settings"
  ON smtp_settings
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Policy: Only super admins can insert SMTP settings
CREATE POLICY "Super admins can insert SMTP settings"
  ON smtp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Policy: Only super admins can update SMTP settings
CREATE POLICY "Super admins can update SMTP settings"
  ON smtp_settings
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Policy: Only super admins can delete SMTP settings
CREATE POLICY "Super admins can delete SMTP settings"
  ON smtp_settings
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Function to ensure only one active SMTP configuration
CREATE OR REPLACE FUNCTION ensure_single_active_smtp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other configurations
    UPDATE smtp_settings
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active configuration
DROP TRIGGER IF EXISTS ensure_single_active_smtp_trigger ON smtp_settings;
CREATE TRIGGER ensure_single_active_smtp_trigger
  BEFORE INSERT OR UPDATE ON smtp_settings
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_smtp();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_smtp_settings_active ON smtp_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_smtp_settings_configured_by ON smtp_settings(configured_by);

-- ============================================
-- Migration: 20251105085234_add_invoice_status_auto_update.sql
-- ============================================

/*
  # Auto-update invoice status based on payments

  1. Changes
    - Create a function to calculate and update invoice status
    - Add a trigger to update invoice status when payments are added/deleted/updated
  
  2. Logic
    - Calculate total paid from invoice_payments
    - Compare with invoice total
    - Update status: 'paid' if fully paid, 'partial' if partially paid, 'draft' if unpaid
*/

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_total NUMERIC;
  v_total_paid NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Get the invoice_id (works for INSERT, UPDATE, DELETE)
  DECLARE
    v_invoice_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_invoice_id := OLD.invoice_id;
    ELSE
      v_invoice_id := NEW.invoice_id;
    END IF;

    -- Get invoice total
    SELECT total INTO v_invoice_total
    FROM invoices
    WHERE id = v_invoice_id;

    -- Calculate total paid
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM invoice_payments
    WHERE invoice_id = v_invoice_id;

    -- Determine new status
    IF v_total_paid = 0 THEN
      v_new_status := 'draft';
    ELSIF v_total_paid >= v_invoice_total THEN
      v_new_status := 'paid';
    ELSE
      v_new_status := 'partial';
    END IF;

    -- Update invoice status
    UPDATE invoices
    SET status = v_new_status
    WHERE id = v_invoice_id;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON invoice_payments;

-- Create trigger for invoice_payments
CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();

-- ============================================
-- Migration: 20251105104651_add_rcs_field_to_profiles.sql
-- ============================================

/*
  # Add RCS Field to Profiles

  ## Overview
  Add a customizable RCS (Registre du Commerce et des Sociétés) field to the profiles table.
  This allows users to customize the company registration information displayed on proforma PDFs.

  ## Changes
  1. New Column
    - `laboratory_rcs` (text, nullable) - Company registration information (e.g., "RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A")
    - Default value provided for backward compatibility

  ## Notes
  - Field is nullable to allow users who don't need this information to leave it empty
  - Users can customize this text from the settings page
  - Will be displayed on proforma PDFs
*/

-- Add laboratory_rcs column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'laboratory_rcs'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN laboratory_rcs text DEFAULT 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';
  END IF;
END $$;

-- ============================================
-- Migration: 20251105113038_create_dentist_photo_submission_system.sql
-- ============================================

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


