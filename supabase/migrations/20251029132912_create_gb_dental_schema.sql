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