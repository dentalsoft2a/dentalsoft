/*
  # Fix invoice_payments RLS policies

  1. Changes
    - Drop existing restrictive RLS policies on invoice_payments
    - Create new policies that check if the user owns the invoice (via invoices.user_id)
    - Allow laboratory owners and employees to manage invoice payments
  
  2. Security
    - Users can only manage payments for their own invoices
    - Employees can manage payments for their laboratory's invoices
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own invoice payments" ON invoice_payments;
DROP POLICY IF EXISTS "Users can insert own invoice payments" ON invoice_payments;
DROP POLICY IF EXISTS "Users can update own invoice payments" ON invoice_payments;
DROP POLICY IF EXISTS "Users can delete own invoice payments" ON invoice_payments;

-- Create new policies that check invoice ownership
CREATE POLICY "Users can view own invoice payments"
  ON invoice_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM invoices
      JOIN laboratory_employees ON laboratory_employees.laboratory_profile_id = invoices.user_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND laboratory_employees.user_profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoice payments"
  ON invoice_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM invoices
      JOIN laboratory_employees ON laboratory_employees.laboratory_profile_id = invoices.user_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND laboratory_employees.user_profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice payments"
  ON invoice_payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM invoices
      JOIN laboratory_employees ON laboratory_employees.laboratory_profile_id = invoices.user_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND laboratory_employees.user_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM invoices
      JOIN laboratory_employees ON laboratory_employees.laboratory_profile_id = invoices.user_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND laboratory_employees.user_profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invoice payments"
  ON invoice_payments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM invoices
      JOIN laboratory_employees ON laboratory_employees.laboratory_profile_id = invoices.user_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND laboratory_employees.user_profile_id = auth.uid()
    )
  );
