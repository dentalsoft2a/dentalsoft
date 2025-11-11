/*
  # Create Subscription Invoicing System

  ## Overview
  Create a complete invoicing system for subscription payments with company information management.
  - Automatic invoice generation when user subscribes
  - Company information stored in settings
  - Invoices displayed on subscription page

  ## Changes
  1. New Table: company_settings
    - `id` (uuid, primary key)
    - `company_name` (text) - Name of the application company
    - `company_address` (text) - Complete address
    - `company_postal_code` (text) - Postal code
    - `company_city` (text) - City
    - `company_country` (text) - Country
    - `company_phone` (text) - Phone number
    - `company_email` (text) - Contact email
    - `company_rcs` (text) - RCS number
    - `company_siret` (text) - SIRET number
    - `company_vat` (text) - VAT number
    - `company_iban` (text) - Bank IBAN
    - `company_bic` (text) - Bank BIC
    - `company_logo_url` (text) - Logo URL
    - `invoice_prefix` (text) - Prefix for invoice numbers (default: 'SUB')
    - `updated_at` (timestamptz)

  2. New Table: subscription_invoices
    - `id` (uuid, primary key)
    - `invoice_number` (text, unique, not null) - Generated invoice number
    - `user_id` (uuid, foreign key to user_profiles) - User who subscribed
    - `amount_ht` (decimal) - Amount excluding tax
    - `tax_rate` (decimal) - Tax rate (default 20%)
    - `amount_ttc` (decimal) - Amount including tax
    - `period_start` (date) - Subscription period start
    - `period_end` (date) - Subscription period end
    - `payment_method` (text) - Payment method used
    - `payment_status` (text) - Status: paid, pending, failed
    - `issued_at` (timestamptz) - Invoice issue date
    - `paid_at` (timestamptz) - Payment date
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Super admins can manage company settings
  - Users can view their own subscription invoices
  - Super admins can view all subscription invoices
*/

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'DentalCloud',
  company_address text,
  company_postal_code text,
  company_city text,
  company_country text DEFAULT 'France',
  company_phone text,
  company_email text,
  company_rcs text,
  company_siret text,
  company_vat text,
  company_iban text,
  company_bic text,
  company_logo_url text,
  invoice_prefix text DEFAULT 'SUB',
  updated_at timestamptz DEFAULT now()
);

-- Insert default company settings (only one row should exist)
INSERT INTO company_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount_ht decimal(10, 2) NOT NULL,
  tax_rate decimal(5, 2) DEFAULT 20.00,
  amount_ttc decimal(10, 2) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  payment_method text DEFAULT 'card',
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'failed', 'cancelled')),
  issued_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_user_id ON subscription_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_invoice_number ON subscription_invoices(invoice_number);

-- Function to generate subscription invoice number
CREATE OR REPLACE FUNCTION generate_subscription_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix text;
  next_number integer;
  invoice_num text;
BEGIN
  -- Get the prefix from company settings
  SELECT invoice_prefix INTO prefix
  FROM company_settings
  WHERE id = '00000000-0000-0000-0000-000000000001';

  IF prefix IS NULL THEN
    prefix := 'SUB';
  END IF;

  -- Get the next number by counting existing invoices
  SELECT COUNT(*) + 1 INTO next_number
  FROM subscription_invoices;

  -- Generate invoice number: PREFIX-YYYY-NNNNNN
  invoice_num := prefix || '-' || 
                 to_char(now(), 'YYYY') || '-' || 
                 lpad(next_number::text, 6, '0');

  RETURN invoice_num;
END;
$$;

-- Function to automatically create invoice when subscription is activated
CREATE OR REPLACE FUNCTION create_subscription_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_num text;
  subscription_price decimal;
  amount_ht decimal;
  amount_ttc decimal;
  start_date date;
  end_date date;
BEGIN
  -- Only create invoice if subscription status changed to 'active' and payment is made
  IF NEW.subscription_status = 'active' AND 
     (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') AND
     NEW.subscription_ends_at IS NOT NULL THEN

    -- Get subscription price from settings
    SELECT price_monthly INTO subscription_price
    FROM subscription_plans
    LIMIT 1;

    IF subscription_price IS NULL THEN
      subscription_price := 49.99; -- Default price
    END IF;

    -- Calculate amounts (HT = price, TTC = price * 1.20)
    amount_ht := subscription_price;
    amount_ttc := subscription_price * 1.20;

    -- Calculate period dates
    start_date := COALESCE(NEW.subscription_starts_at, now())::date;
    end_date := NEW.subscription_ends_at::date;

    -- Generate invoice number
    invoice_num := generate_subscription_invoice_number();

    -- Insert invoice
    INSERT INTO subscription_invoices (
      invoice_number,
      user_id,
      amount_ht,
      tax_rate,
      amount_ttc,
      period_start,
      period_end,
      payment_method,
      payment_status,
      issued_at,
      paid_at
    ) VALUES (
      invoice_num,
      NEW.id,
      amount_ht,
      20.00,
      amount_ttc,
      start_date,
      end_date,
      'card',
      'paid',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate invoices
DROP TRIGGER IF EXISTS trigger_create_subscription_invoice ON user_profiles;
CREATE TRIGGER trigger_create_subscription_invoice
  AFTER INSERT OR UPDATE OF subscription_status, subscription_ends_at ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_invoice();

-- Enable RLS on company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies for company_settings
CREATE POLICY "Public can view company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Enable RLS on subscription_invoices
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_invoices
CREATE POLICY "Users can view their own subscription invoices"
  ON subscription_invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all subscription invoices"
  ON subscription_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert subscription invoices"
  ON subscription_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update subscription invoices"
  ON subscription_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
