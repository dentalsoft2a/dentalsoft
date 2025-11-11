/*
  # Add combined status for invoices with credit notes that are fully paid

  1. Changes
    - Modify update_invoice_status_for_invoice() function to handle 'credit_note_paid' status
    - New status 'credit_note_paid': Invoice has correction avoirs AND is fully paid
    - 'credit_note': Invoice has correction avoirs but not fully paid (or net = 0)

  2. Status logic
    - 'credit_note_paid': Has corrections AND paid amount >= net amount > 0
    - 'credit_note': Has corrections AND (net amount <= 0 OR paid amount < net amount)
    - 'paid': No corrections AND paid amount >= invoice total
    - 'partial': 0 < paid amount < amount due (with or without corrections)
    - 'draft': Paid amount = 0
*/

-- Drop existing trigger and recreate with new logic
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON invoice_payments;
DROP TRIGGER IF EXISTS trigger_update_invoice_status_on_credit_note ON credit_notes;
DROP FUNCTION IF EXISTS update_invoice_status_for_invoice(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_invoice_status() CASCADE;
DROP FUNCTION IF EXISTS update_invoice_status_from_credit_note() CASCADE;

-- Helper function to update status for a specific invoice
CREATE OR REPLACE FUNCTION update_invoice_status_for_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_invoice_total NUMERIC;
  v_total_corrections NUMERIC;
  v_net_amount NUMERIC;
  v_total_paid NUMERIC;
  v_new_status TEXT;
  v_has_corrections BOOLEAN;
BEGIN
  -- Get invoice total
  SELECT total INTO v_invoice_total
  FROM invoices
  WHERE id = p_invoice_id;

  -- Calculate total correction credit notes
  SELECT COALESCE(SUM(total), 0) INTO v_total_corrections
  FROM credit_notes
  WHERE corrects_invoice_id = p_invoice_id
    AND type = 'correction'
    AND is_correction = true
    AND reduces_net_amount = true;

  -- Check if there are any corrections
  v_has_corrections := v_total_corrections > 0;

  -- Calculate net amount
  v_net_amount := v_invoice_total - v_total_corrections;

  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = p_invoice_id;

  -- Determine new status
  IF v_net_amount <= 0 THEN
    -- Net amount is 0 or negative (fully corrected)
    v_new_status := 'credit_note';
  ELSIF v_total_paid = 0 THEN
    -- Not paid at all
    v_new_status := 'draft';
  ELSIF v_total_paid >= v_net_amount THEN
    -- Fully paid
    IF v_has_corrections THEN
      -- Invoice has corrections AND is fully paid
      v_new_status := 'credit_note_paid';
    ELSE
      -- Invoice has no corrections and is fully paid
      v_new_status := 'paid';
    END IF;
  ELSE
    -- Partially paid
    v_new_status := 'partial';
  END IF;

  -- Update invoice status
  UPDATE invoices
  SET status = v_new_status
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Create updated function that handles net amount with corrections
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Get invoice_id from trigger operation
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Use the helper function to update status
  PERFORM update_invoice_status_for_invoice(v_invoice_id);

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoice_payments
CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();

-- Function to update invoice status when credit notes change
CREATE OR REPLACE FUNCTION update_invoice_status_from_credit_note()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Get the invoice_id that needs status update
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.corrects_invoice_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new invoice if corrects_invoice_id changed
    IF OLD.corrects_invoice_id IS NOT NULL THEN
      PERFORM update_invoice_status_for_invoice(OLD.corrects_invoice_id);
    END IF;
    v_invoice_id := NEW.corrects_invoice_id;
  ELSE
    v_invoice_id := NEW.corrects_invoice_id;
  END IF;

  -- Update the invoice status if we have an invoice_id
  IF v_invoice_id IS NOT NULL THEN
    PERFORM update_invoice_status_for_invoice(v_invoice_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on credit_notes to update invoice status when corrections change
CREATE TRIGGER trigger_update_invoice_status_on_credit_note
AFTER INSERT OR UPDATE OR DELETE ON credit_notes
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status_from_credit_note();
