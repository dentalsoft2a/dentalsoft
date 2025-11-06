-- ============================================
-- PARTIE 1/10 - Migrations 1 à 8
-- ============================================

-- ============================================
-- Migration: 00000000000000_init_supabase.sql
-- ============================================

/*
  # Initialize Supabase Schema and Roles

  1. Purpose
    - Create the auth schema required by Supabase
    - Create necessary roles (anon, authenticated, service_role, etc.)
    - Set up permissions and grants

  2. Security
    - Properly configure role permissions
    - Set up Row Level Security foundation
*/

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create necessary roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT CREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT CREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN NOINHERIT CREATEROLE CREATEDB;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;

-- Allow anon and authenticated to assume roles through authenticator
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Grant connect privileges
GRANT CONNECT ON DATABASE postgres TO anon, authenticated, service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- Create auth.users table (minimal version for self-hosted)
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz,
  email_change_token_current text,
  email_change_confirm_status smallint,
  banned_until timestamptz,
  reauthentication_token text,
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false,
  deleted_at timestamptz,
  CONSTRAINT users_email_check CHECK (email IS NOT NULL)
);

-- Grant permissions on auth.users
GRANT SELECT ON auth.users TO anon, authenticated, service_role;
GRANT ALL ON auth.users TO supabase_auth_admin;

-- Create helper function for auth.uid()
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Create helper function for auth.role()
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;

-- Create helper function for auth.jwt()
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(
      current_setting('request.jwt.claims', true),
      current_setting('request.jwt.claim', true)
    )::jsonb
$$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMENT ON SCHEMA auth IS 'Supabase authentication schema';
COMMENT ON TABLE auth.users IS 'Supabase authentication users table';


-- ============================================
-- Migration: 20251029132912_create_gb_dental_schema.sql
-- ============================================

/*
  # GB Dental Cloud - Database Schema

  ## Overview
  Complete database schema for dental laboratory management system including users, dentists, proformas, invoices, and delivery notes.

  ## 1. New Tables

  ### `profiles`
  - `id` (uuid, FK to auth.users)
  - `first_name` (text) - User's first name
  - `last_name` (text) - User's last name
  - `laboratory_name` (text) - Name of the dental laboratory
  - `laboratory_logo_url` (text, nullable) - URL to laboratory logo
  - `laboratory_address` (text, nullable) - Laboratory address
  - `laboratory_phone` (text, nullable) - Laboratory phone
  - `laboratory_email` (text, nullable) - Laboratory email
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `dentists`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - Owner of this dentist record
  - `name` (text) - Dentist's name
  - `email` (text, nullable) - Dentist's email
  - `phone` (text, nullable) - Dentist's phone
  - `address` (text, nullable) - Dentist's address
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `proformas`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - Creator of the proforma
  - `dentist_id` (uuid, FK to dentists) - Associated dentist
  - `proforma_number` (text, unique) - Proforma number
  - `date` (date) - Proforma date
  - `status` (text) - Status: 'pending', 'validated', 'invoiced'
  - `notes` (text, nullable) - Additional notes
  - `subtotal` (decimal) - Subtotal before tax
  - `tax_rate` (decimal) - Tax rate percentage
  - `tax_amount` (decimal) - Calculated tax amount
  - `total` (decimal) - Total including tax
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `proforma_items`
  - `id` (uuid, primary key)
  - `proforma_id` (uuid, FK to proformas) - Parent proforma
  - `description` (text) - Work description
  - `quantity` (integer) - Quantity
  - `unit_price` (decimal) - Price per unit
  - `total` (decimal) - Line total (quantity * unit_price)
  - `created_at` (timestamptz) - Record creation timestamp

  ### `invoices`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - Creator of the invoice
  - `dentist_id` (uuid, FK to dentists) - Associated dentist
  - `invoice_number` (text, unique) - Invoice number
  - `date` (date) - Invoice date
  - `month` (integer) - Month (1-12)
  - `year` (integer) - Year
  - `status` (text) - Status: 'draft', 'sent', 'paid'
  - `notes` (text, nullable) - Additional notes
  - `subtotal` (decimal) - Subtotal before tax
  - `tax_rate` (decimal) - Tax rate percentage
  - `tax_amount` (decimal) - Calculated tax amount
  - `total` (decimal) - Total including tax
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `invoice_proformas`
  - `id` (uuid, primary key)
  - `invoice_id` (uuid, FK to invoices) - Parent invoice
  - `proforma_id` (uuid, FK to proformas) - Linked proforma
  - `created_at` (timestamptz) - Record creation timestamp

  ### `delivery_notes`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - Creator of the delivery note
  - `dentist_id` (uuid, FK to dentists) - Associated dentist
  - `proforma_id` (uuid, FK to proformas, nullable) - Related proforma
  - `delivery_number` (text, unique) - Delivery note number
  - `date` (date) - Delivery date
  - `items` (jsonb) - Array of delivered items
  - `compliance_text` (text, nullable) - Compliance certificate text
  - `signature` (text, nullable) - Signature data
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## 2. Security

  ### Row Level Security (RLS)
  - Enable RLS on all tables
  - Users can only access their own data
  - All policies check authentication status
  - Policies enforce user_id matching for data isolation

  ### Policies
  - SELECT: Users can view their own records
  - INSERT: Users can create records for themselves
  - UPDATE: Users can update their own records
  - DELETE: Users can delete their own records

  ## 3. Notes
  - All monetary values use decimal type for precision
  - Timestamps use timestamptz for timezone awareness
  - UUIDs used for all primary keys
  - Foreign key constraints ensure referential integrity
  - Unique constraints on number fields prevent duplicates
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  laboratory_name text NOT NULL,
  laboratory_logo_url text,
  laboratory_address text,
  laboratory_phone text,
  laboratory_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create dentists table
CREATE TABLE IF NOT EXISTS dentists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dentists"
  ON dentists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dentists"
  ON dentists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dentists"
  ON dentists FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own dentists"
  ON dentists FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create proformas table
CREATE TABLE IF NOT EXISTS proformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  proforma_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'invoiced')),
  notes text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(5, 2) NOT NULL DEFAULT 20,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proformas"
  ON proformas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own proformas"
  ON proformas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proformas"
  ON proformas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own proformas"
  ON proformas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create proforma_items table
CREATE TABLE IF NOT EXISTS proforma_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id uuid NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10, 2) NOT NULL,
  total decimal(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proforma items"
  ON proforma_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own proforma items"
  ON proforma_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own proforma items"
  ON proforma_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proforma items"
  ON proforma_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  month integer NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  notes text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(10, 2) NOT NULL DEFAULT 20,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create invoice_proformas junction table
CREATE TABLE IF NOT EXISTS invoice_proformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  proforma_id uuid NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(invoice_id, proforma_id)
);

ALTER TABLE invoice_proformas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice proformas"
  ON invoice_proformas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_proformas.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice proformas"
  ON invoice_proformas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_proformas.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice proformas"
  ON invoice_proformas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_proformas.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Create delivery_notes table
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  proforma_id uuid REFERENCES proformas(id) ON DELETE SET NULL,
  delivery_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb NOT NULL DEFAULT '[]',
  compliance_text text,
  signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery notes"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own delivery notes"
  ON delivery_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own delivery notes"
  ON delivery_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own delivery notes"
  ON delivery_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dentists_user_id ON dentists(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_user_id ON proformas(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_dentist_id ON proformas(dentist_id);
CREATE INDEX IF NOT EXISTS idx_proformas_status ON proformas(status);
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_dentist_id ON invoices(dentist_id);
CREATE INDEX IF NOT EXISTS idx_invoice_proformas_invoice_id ON invoice_proformas(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_proformas_proforma_id ON invoice_proformas(proforma_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_id ON delivery_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_dentist_id ON delivery_notes(dentist_id);

-- ============================================
-- Migration: 20251029135224_add_delivery_note_fields.sql
-- ============================================

/*
  # Ajout de champs pour les bons de livraison

  ## Modifications
  
  1. Ajout de colonnes à la table `delivery_notes`
    - `prescription_date` (date) - Date de prescription
  
  2. Modification de la structure des items
    Les items stockés en JSONB contiendront maintenant :
    - description (text) - Description de l'article
    - quantity (integer) - Quantité
    - unit_price (decimal) - Prix unitaire
    - unit (text) - Unité (ex: "pièce", "set", etc.)
    - shade (text) - Teinte
    - tooth_number (text) - Numéro de dent
  
  ## Notes
  - La colonne items reste en JSONB pour plus de flexibilité
  - Compatible avec les données existantes
*/

-- Ajouter la colonne prescription_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'prescription_date'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN prescription_date date;
  END IF;
END $$;

-- ============================================
-- Migration: 20251029140622_add_patients_and_catalog.sql
-- ============================================

/*
  # Add Patients and Catalog Items

  1. New Tables
    - `patients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `date_of_birth` (date, optional)
      - `phone` (text, optional)
      - `email` (text, optional)
      - `address` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `catalog_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Nom de l'article
      - `description` (text, optional)
      - `default_unit` (text, optional) - Unité par défaut (ex: unité, ml, g)
      - `default_price` (decimal) - Prix unitaire HT par défaut
      - `category` (text, optional) - Catégorie de l'article
      - `is_active` (boolean) - Article actif ou archivé
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to existing tables
    - Add `patient_id` to `delivery_notes` table

  3. Security
    - Enable RLS on `patients` table
    - Enable RLS on `catalog_items` table
    - Add policies for authenticated users to manage their own data
*/

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  default_unit text DEFAULT 'unité',
  default_price decimal(10, 2) DEFAULT 0.00 NOT NULL,
  category text DEFAULT '',
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catalog items"
  ON catalog_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catalog items"
  ON catalog_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catalog items"
  ON catalog_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own catalog items"
  ON catalog_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add patient_id to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN patient_id uuid REFERENCES patients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_id ON catalog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_patient_id ON delivery_notes(patient_id);

-- ============================================
-- Migration: 20251029141813_add_patient_name_to_delivery_notes.sql
-- ============================================

/*
  # Add patient_name to delivery_notes

  1. Changes
    - Add `patient_name` (text) column to `delivery_notes` table
    - This allows storing the patient name directly as a text field instead of a reference
*/

-- Add patient_name column to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN patient_name text;
  END IF;
END $$;

-- ============================================
-- Migration: 20251029152543_add_delivery_note_id_to_proforma_items.sql
-- ============================================

/*
  # Ajout de la référence aux bons de livraison dans proforma_items

  1. Modifications
    - Ajout de la colonne `delivery_note_id` à la table `proforma_items`
      - Cette colonne relie chaque item de proforma à son bon de livraison d'origine
      - Elle est nullable car des items peuvent exister sans lien avec un bon de livraison
  
  2. Notes
    - Cette colonne permet de regrouper les items par bon de livraison lors de la génération du PDF proforma
    - La contrainte de clé étrangère assure l'intégrité référentielle
*/

-- Ajouter la colonne delivery_note_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proforma_items' AND column_name = 'delivery_note_id'
  ) THEN
    ALTER TABLE proforma_items ADD COLUMN delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Migration: 20251030095109_add_partial_status_to_invoices.sql
-- ============================================

/*
  # Add partial payment status to invoices

  1. Changes
    - Add 'partial' status to invoices table status check constraint
    - This allows tracking invoices that have been partially paid

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  -- Drop the existing check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_status_check'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
  END IF;

  -- Add new constraint with 'partial' status
  ALTER TABLE invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'sent', 'paid', 'partial'));
END $$;

-- ============================================
-- Migration: 20251101235239_add_status_to_delivery_notes.sql
-- ============================================

/*
  # Add status field to delivery_notes

  1. Changes
    - Add `status` (text) column to `delivery_notes` table
    - Status values: 'pending', 'in_progress', 'completed'
    - Default value: 'pending'
  
  2. Notes
    - This allows tracking the completion status of delivery notes
    - Compatible with existing data (will default to 'pending')
*/

-- Add status column to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'status'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;

