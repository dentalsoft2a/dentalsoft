/*
  # Add credit note type and correction tracking

  1. Changes
    - Add `type` column to credit_notes: 'correction' or 'refund'
      - 'correction': Avoir qui corrige une erreur de facturation (réduit le montant net à payer)
      - 'refund': Avoir qui crée un crédit disponible pour paiements futurs

    - Add `is_correction` boolean for quick filtering
    - Add `corrects_invoice_id` to track which invoice is being corrected
    - Add `reduces_net_amount` boolean to indicate if this avoir reduces the net payable amount

  2. Logic
    - Correction avoirs reduce the net amount due on the invoice
    - Refund avoirs create available credit for the client
    - source_invoice_id tracks which invoice generated this avoir
    - corrects_invoice_id tracks which invoice this avoir corrects (can be different)

  3. Notes
    - Default type is 'refund' for backward compatibility
    - Existing credit notes will be marked as 'refund'
    - Only correction type avoirs reduce net amount to pay
*/

-- Add new columns to credit_notes
ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS type text DEFAULT 'refund' CHECK (type IN ('correction', 'refund'));

ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS is_correction boolean DEFAULT false;

ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS corrects_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS reduces_net_amount boolean DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_type ON credit_notes(type);
CREATE INDEX IF NOT EXISTS idx_credit_notes_is_correction ON credit_notes(is_correction);
CREATE INDEX IF NOT EXISTS idx_credit_notes_corrects_invoice_id ON credit_notes(corrects_invoice_id);

-- Add comments
COMMENT ON COLUMN credit_notes.type IS 'Type of credit note: correction (fixes invoice error) or refund (creates available credit)';
COMMENT ON COLUMN credit_notes.is_correction IS 'True if this credit note corrects an invoice error';
COMMENT ON COLUMN credit_notes.corrects_invoice_id IS 'The invoice that this credit note corrects (for correction type)';
COMMENT ON COLUMN credit_notes.reduces_net_amount IS 'True if this credit note reduces the net amount to pay on the invoice';

-- Update existing credit notes to be refund type
UPDATE credit_notes
SET
  type = 'refund',
  is_correction = false,
  reduces_net_amount = false
WHERE type IS NULL OR type = 'refund';
