/*
  # Update invoice status calculation to handle net amount with corrections

  1. Changes
    - Modify update_invoice_status() function to calculate net amount
    - Net amount = invoice total - correction credit notes
    - Status is now based on payments vs net amount, not gross amount

  2. Logic
    - Calculate total correction avoirs for the invoice
    - Subtract corrections from invoice total to get net amount
    - Compare payments against net amount to determine status
    - If net amount is 0 or less, mark as 'credit_note'

  3. Status calculation
    - 'credit_note': Net amount is 0 or negative (fully corrected)
    - 'paid': Paid amount >= net amount (fully paid)
    - 'partial': 0 < paid amount < net amount (partially paid)
    - 'draft': Paid amount = 0 (not paid)
*/

-- Drop existing trigger first, then function
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON invoice_payments;
DROP FUNCTION IF EXISTS update_invoice_status() CASCADE;

-- Helper function to update status for a specific invoice (define first)
CREATE OR REPLACE FUNCTION update_invoice_status_for_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_invoice_total NUMERIC;
  v_total_corrections NUMERIC;
  v_net_amount NUMERIC;
  v_total_paid NUMERIC;
  v_new_status TEXT;
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

  -- Calculate net amount
  v_net_amount := v_invoice_total - v_total_corrections;

  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = p_invoice_id;

  -- Determine new status
  IF v_net_amount <= 0 THEN
    v_new_status := 'credit_note';
  ELSIF v_total_paid = 0 THEN
    v_new_status := 'draft';
  ELSIF v_total_paid >= v_net_amount THEN
    v_new_status := 'paid';
  ELSE
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

-- Create new trigger on credit_notes to update invoice status when corrections change
DROP TRIGGER IF EXISTS trigger_update_invoice_status_on_credit_note ON credit_notes;
CREATE TRIGGER trigger_update_invoice_status_on_credit_note
AFTER INSERT OR UPDATE OR DELETE ON credit_notes
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status_from_credit_note();
