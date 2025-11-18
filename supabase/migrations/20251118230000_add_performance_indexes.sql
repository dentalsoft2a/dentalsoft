/*
  # Add Performance Indexes for Query Optimization

  1. Purpose
    - Add indexes on frequently filtered columns to improve query performance
    - Optimize joins and lookups for common queries
    - Reduce database resource usage

  2. New Indexes
    - delivery_notes: user_id + status, user_id + date
    - invoices: user_id + status, user_id + month + year, user_id + dentist_id
    - credit_notes: corrects_invoice_id, source_invoice_id, dentist_id + used
    - proformas: user_id + status, user_id + dentist_id
    - proforma_items: proforma_id, delivery_note_id
    - invoice_proformas: invoice_id, proforma_id
    - invoice_payments: invoice_id, payment_date
    - catalog_items: user_id + track_stock
    - resources: user_id + track_stock
    - resource_variants: resource_id + is_active
    - dentists: user_id + email
    - user_profiles: subscription_status, role
*/

-- Delivery notes indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_status
  ON delivery_notes(user_id, status)
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_date
  ON delivery_notes(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_dentist
  ON delivery_notes(dentist_id);

-- Invoices indexes for filtering by status, period, and dentist
CREATE INDEX IF NOT EXISTS idx_invoices_user_status
  ON invoices(user_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_user_period
  ON invoices(user_id, month, year);

CREATE INDEX IF NOT EXISTS idx_invoices_user_dentist
  ON invoices(user_id, dentist_id);

CREATE INDEX IF NOT EXISTS idx_invoices_date
  ON invoices(date DESC);

-- Credit notes indexes for joins and filtering
CREATE INDEX IF NOT EXISTS idx_credit_notes_corrects_invoice
  ON credit_notes(corrects_invoice_id)
  WHERE corrects_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_notes_source_invoice
  ON credit_notes(source_invoice_id)
  WHERE source_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_notes_dentist_used
  ON credit_notes(dentist_id, used)
  WHERE used = false;

CREATE INDEX IF NOT EXISTS idx_credit_notes_user_dentist
  ON credit_notes(user_id, dentist_id);

-- Proformas indexes
CREATE INDEX IF NOT EXISTS idx_proformas_user_status
  ON proformas(user_id, status);

CREATE INDEX IF NOT EXISTS idx_proformas_user_dentist
  ON proformas(user_id, dentist_id);

CREATE INDEX IF NOT EXISTS idx_proformas_date
  ON proformas(date DESC);

-- Proforma items for joins
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma
  ON proforma_items(proforma_id);

CREATE INDEX IF NOT EXISTS idx_proforma_items_delivery_note
  ON proforma_items(delivery_note_id)
  WHERE delivery_note_id IS NOT NULL;

-- Invoice-Proforma junction table
CREATE INDEX IF NOT EXISTS idx_invoice_proformas_invoice
  ON invoice_proformas(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_proformas_proforma
  ON invoice_proformas(proforma_id);

-- Invoice payments
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice
  ON invoice_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_date
  ON invoice_payments(payment_date DESC);

-- Stock management indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_stock
  ON catalog_items(user_id, track_stock)
  WHERE track_stock = true;

CREATE INDEX IF NOT EXISTS idx_resources_user_stock
  ON resources(user_id, track_stock)
  WHERE track_stock = true;

CREATE INDEX IF NOT EXISTS idx_resource_variants_resource_active
  ON resource_variants(resource_id, is_active)
  WHERE is_active = true;

-- Dentists indexes
CREATE INDEX IF NOT EXISTS idx_dentists_user
  ON dentists(user_id);

CREATE INDEX IF NOT EXISTS idx_dentists_email
  ON dentists(email);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status
  ON user_profiles(subscription_status)
  WHERE subscription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON user_profiles(role)
  WHERE role IS NOT NULL;

-- Laboratory employees
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_email_active
  ON laboratory_employees(email, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_laboratory_employees_lab
  ON laboratory_employees(laboratory_profile_id);

-- Audit log (for admin queries)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_date
  ON audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_action
  ON audit_log(table_name, action);

-- Photo submissions
CREATE INDEX IF NOT EXISTS idx_photo_submissions_dentist
  ON photo_submissions(dentist_account_id);

CREATE INDEX IF NOT EXISTS idx_photo_submissions_lab_status
  ON photo_submissions(laboratory_profile_id, status);

-- Subscription invoices
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_user_date
  ON subscription_invoices(user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status
  ON subscription_invoices(payment_status);
