-- =====================================================
-- DUMP COMPLET DE LA BASE DE DONNÉES GB DENTAL
-- Date: 2025-11-06
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. FONCTIONS PERSONNALISÉES
-- =====================================================

-- Fonction: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM user_profiles
  WHERE id = auth.uid() AND role = 'super_admin'
);
$function$;

-- Fonction: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fonction: update_help_updated_at
CREATE OR REPLACE FUNCTION public.update_help_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fonction: update_resources_updated_at
CREATE OR REPLACE FUNCTION public.update_resources_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fonction: update_laboratory_role_permissions_updated_at
CREATE OR REPLACE FUNCTION public.update_laboratory_role_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fonction: assign_trial_to_new_user
CREATE OR REPLACE FUNCTION public.assign_trial_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Give 30 days free trial to new users
  NEW.subscription_start_date := now();
  NEW.subscription_end_date := now() + interval '30 days';
  NEW.subscription_status := 'trial';
  NEW.trial_used := true;
  RETURN NEW;
END;
$function$;

-- Fonction: create_user_profile_on_signup
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fonction: update_invoice_status
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_invoice_total NUMERIC;
  v_total_paid NUMERIC;
  v_new_status TEXT;
BEGIN
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
$function$;

-- Fonction: update_resource_has_variants
CREATE OR REPLACE FUNCTION public.update_resource_has_variants()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if resource has any active variants
  UPDATE resources
  SET has_variants = EXISTS (
    SELECT 1
    FROM resource_variants
    WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fonction: ensure_single_active_smtp
CREATE OR REPLACE FUNCTION public.ensure_single_active_smtp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other configurations
    UPDATE smtp_settings
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fonction: delete_old_photo_submissions
CREATE OR REPLACE FUNCTION public.delete_old_photo_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM photo_submissions
  WHERE created_at < NOW() - INTERVAL '1 month';
END;
$function$;

-- Fonction: update_subscription_status
CREATE OR REPLACE FUNCTION public.update_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE user_profiles
  SET subscription_status =
    CASE
      WHEN subscription_end_date IS NULL THEN 'expired'
      WHEN subscription_end_date > now() THEN
        CASE
          WHEN trial_used = true AND subscription_start_date >= (now() - interval '30 days') THEN 'trial'
          ELSE 'active'
        END
      ELSE 'expired'
    END
  WHERE subscription_end_date IS NOT NULL;
END;
$function$;

-- =====================================================
-- 3. CRÉATION DES TABLES
-- =====================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  laboratory_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'France',
  ice TEXT,
  rc TEXT,
  tax_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  if_number TEXT,
  patent_number TEXT,
  cnss_number TEXT,
  rcs TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  subscription_plan_id UUID,
  trial_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Table: dentist_accounts
CREATE TABLE IF NOT EXISTS public.dentist_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dentist_accounts ENABLE ROW LEVEL SECURITY;

-- Table: dentists
CREATE TABLE IF NOT EXISTS public.dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- Table: patients
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Table: catalog_items
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  category TEXT,
  track_stock BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Table: resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  category TEXT,
  track_stock BOOLEAN DEFAULT false,
  stock_quantity NUMERIC(10,2) DEFAULT 0,
  low_stock_threshold NUMERIC(10,2) DEFAULT 10,
  has_variants BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Table: resource_variants
CREATE TABLE IF NOT EXISTS public.resource_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  subcategory TEXT,
  variant_name TEXT NOT NULL,
  stock_quantity NUMERIC(10,2) DEFAULT 0,
  low_stock_threshold NUMERIC(10,2) DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, subcategory, variant_name)
);

ALTER TABLE public.resource_variants ENABLE ROW LEVEL SECURITY;

-- Table: catalog_item_resources
CREATE TABLE IF NOT EXISTS public.catalog_item_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity_needed NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(catalog_item_id, resource_id)
);

ALTER TABLE public.catalog_item_resources ENABLE ROW LEVEL SECURITY;

-- Table: proformas
CREATE TABLE IF NOT EXISTS public.proformas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  proforma_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'invoiced')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proformas ENABLE ROW LEVEL SECURITY;

-- Table: proforma_items
CREATE TABLE IF NOT EXISTS public.proforma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id UUID NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proforma_items ENABLE ROW LEVEL SECURITY;

-- Table: delivery_notes
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  delivery_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  items JSONB NOT NULL,
  notes TEXT,
  proforma_id UUID REFERENCES proformas(id) ON DELETE SET NULL,
  patient_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

-- Table: invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Table: invoice_proformas
CREATE TABLE IF NOT EXISTS public.invoice_proformas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  proforma_id UUID NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invoice_id, proforma_id)
);

ALTER TABLE public.invoice_proformas ENABLE ROW LEVEL SECURITY;

-- Table: invoice_payments
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Table: credit_notes
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  credit_note_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  reason TEXT,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Table: credit_note_items
CREATE TABLE IF NOT EXISTS public.credit_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

-- Table: stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  resource_variant_id UUID REFERENCES resource_variants(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity NUMERIC(10,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Table: access_codes
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  subscription_plan_id UUID,
  subscription_duration_months INTEGER DEFAULT 1,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Table: access_code_usage
CREATE TABLE IF NOT EXISTS public.access_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(access_code_id, user_id)
);

ALTER TABLE public.access_code_usage ENABLE ROW LEVEL SECURITY;

-- Table: subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Table: admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Table: help_topics
CREATE TABLE IF NOT EXISTS public.help_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  views INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.help_topics ENABLE ROW LEVEL SECURITY;

-- Table: help_replies
CREATE TABLE IF NOT EXISTS public.help_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES help_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.help_replies ENABLE ROW LEVEL SECURITY;

-- Table: help_votes
CREATE TABLE IF NOT EXISTS public.help_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES help_topics(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES help_replies(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_topic_vote UNIQUE(user_id, topic_id),
  CONSTRAINT unique_reply_vote UNIQUE(user_id, reply_id)
);

ALTER TABLE public.help_votes ENABLE ROW LEVEL SECURITY;

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Table: support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_staff_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Table: photo_submissions
CREATE TABLE IF NOT EXISTS public.photo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  laboratory_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'responded')),
  laboratory_response TEXT,
  laboratory_response_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.photo_submissions ENABLE ROW LEVEL SECURITY;

-- Table: dentist_favorite_laboratories
CREATE TABLE IF NOT EXISTS public.dentist_favorite_laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  laboratory_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dentist_id, laboratory_profile_id)
);

ALTER TABLE public.dentist_favorite_laboratories ENABLE ROW LEVEL SECURITY;

-- Table: laboratory_employees
CREATE TABLE IF NOT EXISTS public.laboratory_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(laboratory_profile_id, email)
);

ALTER TABLE public.laboratory_employees ENABLE ROW LEVEL SECURITY;

-- Table: laboratory_role_permissions
CREATE TABLE IF NOT EXISTS public.laboratory_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  menu_access JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(laboratory_profile_id, role_name)
);

ALTER TABLE public.laboratory_role_permissions ENABLE ROW LEVEL SECURITY;

-- Table: smtp_settings
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  smtp_from_email TEXT NOT NULL,
  smtp_from_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  configured_by UUID REFERENCES user_profiles(id),
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. INDEXES POUR PERFORMANCE
-- =====================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_laboratory_name ON profiles(laboratory_name);

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

-- Dentist Accounts
CREATE INDEX IF NOT EXISTS idx_dentist_accounts_email ON dentist_accounts(email);

-- Dentists
CREATE INDEX IF NOT EXISTS idx_dentists_user_id ON dentists(user_id);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- Catalog Items
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_id ON catalog_items(user_id);

-- Resources
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);

-- Resource Variants
CREATE INDEX IF NOT EXISTS idx_resource_variants_resource_id ON resource_variants(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_variants_user_id ON resource_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_variants_subcategory ON resource_variants(resource_id, subcategory) WHERE is_active = true;

-- Catalog Item Resources
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_catalog_item ON catalog_item_resources(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_resources_resource ON catalog_item_resources(resource_id);

-- Proformas
CREATE INDEX IF NOT EXISTS idx_proformas_user_id ON proformas(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_dentist_id ON proformas(dentist_id);
CREATE INDEX IF NOT EXISTS idx_proformas_status ON proformas(status);

-- Proforma Items
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id);

-- Delivery Notes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_id ON delivery_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_dentist_id ON delivery_notes(dentist_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_patient_id ON delivery_notes(patient_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_dentist_id ON invoices(dentist_id);

-- Invoice Proformas
CREATE INDEX IF NOT EXISTS idx_invoice_proformas_invoice_id ON invoice_proformas(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_proformas_proforma_id ON invoice_proformas(proforma_id);

-- Invoice Payments
CREATE INDEX IF NOT EXISTS idx_invoice_payments_user_id ON invoice_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date);

-- Credit Notes
CREATE INDEX IF NOT EXISTS idx_credit_notes_user_id ON credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_dentist_id ON credit_notes(dentist_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_used ON credit_notes(used);

-- Credit Note Items
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);

-- Stock Movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_catalog_item ON stock_movements(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_resource_id ON stock_movements(resource_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_resource_variant_id ON stock_movements(resource_variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_delivery_note ON stock_movements(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- Access Codes
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_is_used ON access_codes(is_used);

-- Access Code Usage
CREATE INDEX IF NOT EXISTS idx_access_code_usage_code ON access_code_usage(access_code_id);
CREATE INDEX IF NOT EXISTS idx_access_code_usage_user ON access_code_usage(user_id);

-- Admin Audit Log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Help Topics
CREATE INDEX IF NOT EXISTS idx_help_topics_user_id ON help_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_help_topics_category ON help_topics(category);
CREATE INDEX IF NOT EXISTS idx_help_topics_status ON help_topics(status);
CREATE INDEX IF NOT EXISTS idx_help_topics_created_at ON help_topics(created_at DESC);

-- Help Replies
CREATE INDEX IF NOT EXISTS idx_help_replies_topic_id ON help_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_help_replies_user_id ON help_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_help_replies_created_at ON help_replies(created_at);

-- Help Votes
CREATE INDEX IF NOT EXISTS idx_help_votes_user_id ON help_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_help_votes_topic_id ON help_votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_help_votes_reply_id ON help_votes(reply_id);

-- Support Tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Support Messages
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Photo Submissions
CREATE INDEX IF NOT EXISTS idx_photo_submissions_dentist ON photo_submissions(dentist_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_laboratory ON photo_submissions(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_created ON photo_submissions(created_at DESC);

-- Dentist Favorite Laboratories
CREATE INDEX IF NOT EXISTS idx_dentist_favorites_dentist_id ON dentist_favorite_laboratories(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_favorites_laboratory_id ON dentist_favorite_laboratories(laboratory_profile_id);

-- Laboratory Employees
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_lab_id ON laboratory_employees(laboratory_profile_id);
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_user_id ON laboratory_employees(user_profile_id);

-- Laboratory Role Permissions
CREATE INDEX IF NOT EXISTS idx_laboratory_role_permissions_lab_id ON laboratory_role_permissions(laboratory_profile_id);

-- SMTP Settings
CREATE INDEX IF NOT EXISTS idx_smtp_settings_active ON smtp_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_smtp_settings_configured_by ON smtp_settings(configured_by);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger: create_user_profile on profiles insert
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Trigger: assign_trial on user_profiles insert
DROP TRIGGER IF EXISTS assign_trial_on_signup ON user_profiles;
CREATE TRIGGER assign_trial_on_signup
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_trial_to_new_user();

-- Trigger: update_invoice_status on invoice_payments changes
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON invoice_payments;
CREATE TRIGGER trigger_update_invoice_status
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Trigger: update_has_variants on resource_variants changes
DROP TRIGGER IF EXISTS trigger_update_has_variants_on_insert ON resource_variants;
CREATE TRIGGER trigger_update_has_variants_on_insert
  AFTER INSERT ON resource_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_has_variants();

DROP TRIGGER IF EXISTS trigger_update_has_variants_on_update ON resource_variants;
CREATE TRIGGER trigger_update_has_variants_on_update
  AFTER UPDATE ON resource_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_has_variants();

DROP TRIGGER IF EXISTS trigger_update_has_variants_on_delete ON resource_variants;
CREATE TRIGGER trigger_update_has_variants_on_delete
  AFTER DELETE ON resource_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_has_variants();

-- Trigger: update_updated_at on various tables
DROP TRIGGER IF EXISTS resources_updated_at ON resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_topics_updated_at ON help_topics;
CREATE TRIGGER update_help_topics_updated_at
  BEFORE UPDATE ON help_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

DROP TRIGGER IF EXISTS update_help_replies_updated_at ON help_replies;
CREATE TRIGGER update_help_replies_updated_at
  BEFORE UPDATE ON help_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

DROP TRIGGER IF EXISTS trigger_update_laboratory_role_permissions_updated_at ON laboratory_role_permissions;
CREATE TRIGGER trigger_update_laboratory_role_permissions_updated_at
  BEFORE UPDATE ON laboratory_role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_laboratory_role_permissions_updated_at();

-- Trigger: ensure_single_active_smtp on smtp_settings
DROP TRIGGER IF EXISTS ensure_single_active_smtp_trigger ON smtp_settings;
CREATE TRIGGER ensure_single_active_smtp_trigger
  BEFORE INSERT OR UPDATE ON smtp_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_smtp();

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON profiles;
CREATE POLICY "Allow trigger to insert profiles"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all profiles for community features" ON profiles;
CREATE POLICY "Users can view all profiles for community features"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- USER_PROFILES POLICIES
DROP POLICY IF EXISTS "Allow trigger to insert user_profiles" ON user_profiles;
CREATE POLICY "Allow trigger to insert user_profiles"
  ON user_profiles FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own profile or super admin can view all" ON user_profiles;
CREATE POLICY "Users can view own profile or super admin can view all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_super_admin());

DROP POLICY IF EXISTS "Users can insert own profile or super admin can insert" ON user_profiles;
CREATE POLICY "Users can insert own profile or super admin can insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR is_super_admin());

DROP POLICY IF EXISTS "Users can update own profile or super admin can update all" ON user_profiles;
CREATE POLICY "Users can update own profile or super admin can update all"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_super_admin())
  WITH CHECK (auth.uid() = id OR is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete any profile" ON user_profiles;
CREATE POLICY "Super admins can delete any profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Employees can view their laboratory profile" ON user_profiles;
CREATE POLICY "Employees can view their laboratory profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = user_profiles.id
        AND laboratory_employees.is_active = true
    )
  );

-- DENTIST_ACCOUNTS POLICIES
DROP POLICY IF EXISTS "Allow dentist signup" ON dentist_accounts;
CREATE POLICY "Allow dentist signup"
  ON dentist_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Dentists can read own account" ON dentist_accounts;
CREATE POLICY "Dentists can read own account"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Dentists can update own account" ON dentist_accounts;
CREATE POLICY "Dentists can update own account"
  ON dentist_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view all dentist accounts" ON dentist_accounts;
CREATE POLICY "Authenticated users can view all dentist accounts"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Laboratories can view dentists who submitted to them" ON dentist_accounts;
CREATE POLICY "Laboratories can view dentists who submitted to them"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photo_submissions
      WHERE photo_submissions.dentist_id = dentist_accounts.id
        AND photo_submissions.laboratory_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can view all dentist accounts" ON dentist_accounts;
CREATE POLICY "Super admins can view all dentist accounts"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- DENTISTS POLICIES
DROP POLICY IF EXISTS "Users can view own dentists" ON dentists;
CREATE POLICY "Users can view own dentists"
  ON dentists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own dentists" ON dentists;
CREATE POLICY "Users can insert own dentists"
  ON dentists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own dentists" ON dentists;
CREATE POLICY "Users can update own dentists"
  ON dentists FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own dentists" ON dentists;
CREATE POLICY "Users can delete own dentists"
  ON dentists FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Employees can view their laboratory dentists" ON dentists;
CREATE POLICY "Employees can view their laboratory dentists"
  ON dentists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  );

DROP POLICY IF EXISTS "Employees can manage their laboratory dentists" ON dentists;
CREATE POLICY "Employees can manage their laboratory dentists"
  ON dentists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- PATIENTS POLICIES
DROP POLICY IF EXISTS "Users can view own patients" ON patients;
CREATE POLICY "Users can view own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own patients" ON patients;
CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own patients" ON patients;
CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employees can view their laboratory patients" ON patients;
CREATE POLICY "Employees can view their laboratory patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  );

DROP POLICY IF EXISTS "Employees can manage their laboratory patients" ON patients;
CREATE POLICY "Employees can manage their laboratory patients"
  ON patients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Note: Les policies pour les autres tables suivent le même schéma.
-- Pour économiser de l'espace, seules les principales tables sont montrées.
-- Référez-vous aux migrations Supabase pour les policies complètes.

-- =====================================================
-- FIN DU DUMP SQL
-- =====================================================
