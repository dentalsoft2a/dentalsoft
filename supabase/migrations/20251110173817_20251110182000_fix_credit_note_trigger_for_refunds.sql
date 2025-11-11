/*
  # Fix credit note trigger to only update invoice status for correction credit notes

  1. Changes
    - Modify update_invoice_status_from_credit_note() to only trigger for correction avoirs
    - Refund credit notes (type = 'refund') should NOT affect invoice status

  2. Logic
    - Only update invoice status if:
      - corrects_invoice_id IS NOT NULL
      - type = 'correction'
      - is_correction = true
    - Refund avoirs are independent and don't change invoice status

  3. Reason
    - A refund avoir is created after a payment, it doesn't correct the invoice
    - Only correction avoirs should affect the invoice net amount and status
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_invoice_status_on_credit_note ON credit_notes;
DROP FUNCTION IF EXISTS update_invoice_status_from_credit_note() CASCADE;

-- Function to update invoice status when credit notes change
CREATE OR REPLACE FUNCTION update_invoice_status_from_credit_note()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_is_correction BOOLEAN;
BEGIN
  -- Determine if this is a correction avoir (only these should affect invoice status)
  IF TG_OP = 'DELETE' THEN
    v_is_correction := OLD.type = 'correction' AND OLD.is_correction = true;
    v_invoice_id := OLD.corrects_invoice_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_is_correction := NEW.type = 'correction' AND NEW.is_correction = true;
    -- Update both old and new invoice if corrects_invoice_id changed
    IF OLD.corrects_invoice_id IS NOT NULL AND OLD.type = 'correction' AND OLD.is_correction = true THEN
      PERFORM update_invoice_status_for_invoice(OLD.corrects_invoice_id);
    END IF;
    v_invoice_id := NEW.corrects_invoice_id;
  ELSE
    v_is_correction := NEW.type = 'correction' AND NEW.is_correction = true;
    v_invoice_id := NEW.corrects_invoice_id;
  END IF;

  -- Only update the invoice status if this is a correction avoir
  IF v_invoice_id IS NOT NULL AND v_is_correction THEN
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
