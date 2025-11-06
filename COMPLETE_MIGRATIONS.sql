-- ============================================
-- COMPLETE DATABASE MIGRATION FOR DENTAL CLOUD
-- Execute this ONCE in Supabase SQL Editor
-- ============================================

-- Drop existing policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
    END LOOP;
END $$;

-- Drop existing triggers to avoid conflicts (check if tables exist first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile') THEN
    DROP TRIGGER on_auth_user_created_profile ON auth.users;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_profile_trigger') THEN
    DROP TRIGGER create_user_profile_trigger ON auth.users;
  END IF;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_invoice_status() CASCADE;
DROP FUNCTION IF EXISTS auto_delete_old_photos() CASCADE;

-- Create base schema
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  laboratory_name text NOT NULL,
  laboratory_logo_url text,
  laboratory_address text,
  laboratory_phone text,
  laboratory_email text,
  rcs text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'laboratory' CHECK (role IN ('laboratory', 'dentist', 'super_admin')),
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'cancelled')),
  subscription_plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  subscription_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS dentist_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dentist_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS proforma_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id uuid NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10, 2) NOT NULL,
  total decimal(10, 2) NOT NULL,
  delivery_note_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  month integer NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial')),
  notes text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(10, 2) NOT NULL DEFAULT 20,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_proformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  proforma_id uuid NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(invoice_id, proforma_id)
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  proforma_id uuid REFERENCES proformas(id) ON DELETE SET NULL,
  patient_id uuid,
  delivery_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  patient_name text,
  prescription_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  items jsonb NOT NULL DEFAULT '[]',
  compliance_text text,
  signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  unit text DEFAULT 'unité',
  category text DEFAULT '',
  track_stock boolean DEFAULT false NOT NULL,
  stock_quantity decimal(10, 2) DEFAULT 0,
  low_stock_threshold decimal(10, 2) DEFAULT 10,
  has_variants boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  stock_quantity decimal(10, 2) DEFAULT 0,
  low_stock_threshold decimal(10, 2) DEFAULT 10,
  is_active boolean DEFAULT true NOT NULL,
  subcategory text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(resource_id, name, subcategory)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES catalog_items(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  resource_variant_id uuid REFERENCES resource_variants(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity decimal(10, 2) NOT NULL,
  reason text,
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_item_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  resource_variant_id uuid REFERENCES resource_variants(id) ON DELETE SET NULL,
  quantity_required decimal(10, 2) NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(catalog_item_id, resource_id, resource_variant_id)
);

CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'laboratory' CHECK (role IN ('laboratory', 'dentist')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  UNIQUE(access_code_id, user_id)
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  stripe_price_id text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES help_topics(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES help_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  credit_note_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  notes text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(10, 2) NOT NULL DEFAULT 20,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10, 2) NOT NULL,
  total decimal(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL,
  port integer NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL,
  use_tls boolean DEFAULT true,
  contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photo_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratory_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  photo_urls text[] NOT NULL,
  notes text,
  laboratory_response text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dentist_favorite_laboratories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratory_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dentist_id, laboratory_id)
);

CREATE TABLE IF NOT EXISTS laboratory_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(laboratory_id, email)
);

CREATE TABLE IF NOT EXISTS laboratory_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(laboratory_id, role_name)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_proformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_item_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_favorite_laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_role_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "user_profiles_super_admin" ON user_profiles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "dentists_all" ON dentists FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "patients_all" ON patients FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "proformas_all" ON proformas FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "proforma_items_all" ON proforma_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM proformas WHERE proformas.id = proforma_items.proforma_id AND proformas.user_id = auth.uid()));
CREATE POLICY "invoices_all" ON invoices FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "invoice_proformas_all" ON invoice_proformas FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_proformas.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "invoice_payments_all" ON invoice_payments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_payments.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "delivery_notes_all" ON delivery_notes FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "catalog_items_all" ON catalog_items FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "resources_all" ON resources FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "resource_variants_all" ON resource_variants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM resources WHERE resources.id = resource_variants.resource_id AND resources.user_id = auth.uid()));
CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "catalog_item_resources_all" ON catalog_item_resources FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM catalog_items WHERE catalog_items.id = catalog_item_resources.catalog_item_id AND catalog_items.user_id = auth.uid()));

CREATE POLICY "access_codes_select" ON access_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "access_codes_super_admin" ON access_codes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "access_code_usage_insert" ON access_code_usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscription_plans_select" ON subscription_plans FOR SELECT TO authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "subscription_plans_super_admin" ON subscription_plans FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "support_tickets_super_admin" ON support_tickets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "support_messages_select" ON support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "support_messages_insert" ON support_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "admin_audit_log_super_admin" ON admin_audit_log FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "help_topics_select" ON help_topics FOR SELECT TO authenticated USING (is_published = true OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "help_topics_insert" ON help_topics FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "help_topics_update" ON help_topics FOR UPDATE TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "help_topics_delete" ON help_topics FOR DELETE TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "help_replies_select" ON help_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "help_replies_insert" ON help_replies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "help_votes_all" ON help_votes FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "credit_notes_all" ON credit_notes FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "credit_note_items_all" ON credit_note_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM credit_notes WHERE credit_notes.id = credit_note_items.credit_note_id AND credit_notes.user_id = auth.uid()));

CREATE POLICY "smtp_settings_super_admin" ON smtp_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "smtp_settings_select_contact" ON smtp_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "photo_submissions_dentist" ON photo_submissions FOR ALL TO authenticated USING (submitted_by = auth.uid() OR laboratory_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('laboratory', 'super_admin')));

CREATE POLICY "dentist_favorite_laboratories_all" ON dentist_favorite_laboratories FOR ALL TO authenticated USING (dentist_id = auth.uid());

CREATE POLICY "dentist_accounts_select" ON dentist_accounts FOR SELECT TO authenticated USING (id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('laboratory', 'super_admin')));
CREATE POLICY "dentist_accounts_insert" ON dentist_accounts FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "dentist_accounts_update" ON dentist_accounts FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "laboratory_employees_all" ON laboratory_employees FOR ALL TO authenticated USING (laboratory_id = auth.uid() OR EXISTS (SELECT 1 FROM laboratory_employees WHERE laboratory_id = auth.uid() AND email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "laboratory_role_permissions_all" ON laboratory_role_permissions FOR ALL TO authenticated USING (laboratory_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dentists_user_id ON dentists(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_user_id ON proformas(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_dentist_id ON proformas(dentist_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_id ON delivery_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_id ON catalog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_dentist ON photo_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_lab ON photo_submissions(laboratory_id);

-- Create trigger function for user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, subscription_status)
  VALUES (NEW.id, NEW.email, 'laboratory', 'trial')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(10,2);
  v_invoice_total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total INTO v_invoice_total
  FROM invoices
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF v_total_paid >= v_invoice_total THEN
    UPDATE invoices SET status = 'paid' WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  ELSIF v_total_paid > 0 THEN
    UPDATE invoices SET status = 'partial' WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_invoice_status_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- Add foreign key for delivery_note_id in proforma_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'proforma_items_delivery_note_id_fkey'
  ) THEN
    ALTER TABLE proforma_items
    ADD CONSTRAINT proforma_items_delivery_note_id_fkey
    FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for patient_id in delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_notes_patient_id_fkey'
  ) THEN
    ALTER TABLE delivery_notes
    ADD CONSTRAINT delivery_notes_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Insert default subscription plan
INSERT INTO subscription_plans (name, description, price_monthly, features, is_active)
VALUES (
  'Plan Standard',
  'Accès complet à toutes les fonctionnalités',
  49.99,
  '["Bons de livraison illimités", "Proformas et factures illimités", "Gestion complète", "Support prioritaire"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
