/*
  # Add invoice_id to credit_notes table

  1. Changes
    - Add nullable source_invoice_id column to credit_notes table to track which invoice the credit note was created from
    - Add foreign key constraint to invoices table
    - Add index for performance

  2. Notes
    - This column is nullable because existing credit notes and those created from partial avoir application may not have a source invoice
    - This helps track the maximum credit note amount per invoice
*/

-- Add source_invoice_id column to credit_notes
ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS source_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_source_invoice_id ON credit_notes(source_invoice_id);

-- Add comment
COMMENT ON COLUMN credit_notes.source_invoice_id IS 'The invoice from which this credit note was created';