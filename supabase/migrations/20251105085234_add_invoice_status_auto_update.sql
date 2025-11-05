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