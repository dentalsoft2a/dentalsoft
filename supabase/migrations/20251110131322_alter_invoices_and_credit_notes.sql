/*
  # Modification des tables invoices et credit_notes pour la conformité

  1. Ajout de colonnes de conformité
    - digital_signature, signature_timestamp, facturx_xml
    - is_locked, locked_at, fiscal_period_id
    - hash_sha256, archived_at

  2. Triggers pour empêcher modification de documents verrouillés

  3. Fonctions de calcul de hash
*/

-- Modifier la table invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_xml TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hash_sha256 TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_locked ON invoices(is_locked) WHERE is_locked = true;
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_period ON invoices(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_invoices_archived ON invoices(archived_at) WHERE archived_at IS NOT NULL;

-- Modifier la table credit_notes
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS facturx_xml TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS hash_sha256 TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_credit_notes_locked ON credit_notes(is_locked) WHERE is_locked = true;
CREATE INDEX IF NOT EXISTS idx_credit_notes_fiscal_period ON credit_notes(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_archived ON credit_notes(archived_at) WHERE archived_at IS NOT NULL;

-- Fonction pour empêcher la modification de documents verrouillés
CREATE OR REPLACE FUNCTION prevent_locked_document_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true AND NEW.is_locked = true THEN
    IF (OLD.digital_signature IS DISTINCT FROM NEW.digital_signature OR
        OLD.signature_timestamp IS DISTINCT FROM NEW.signature_timestamp OR
        OLD.facturx_xml IS DISTINCT FROM NEW.facturx_xml OR
        OLD.hash_sha256 IS DISTINCT FROM NEW.hash_sha256 OR
        OLD.archived_at IS DISTINCT FROM NEW.archived_at OR
        OLD.fiscal_period_id IS DISTINCT FROM NEW.fiscal_period_id OR
        OLD.locked_at IS DISTINCT FROM NEW.locked_at) THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Cannot modify locked document. Please create a credit note to correct errors.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_locked_invoice_update ON invoices;
CREATE TRIGGER prevent_locked_invoice_update
BEFORE UPDATE ON invoices
FOR EACH ROW
WHEN (OLD.is_locked = true)
EXECUTE FUNCTION prevent_locked_document_update();

DROP TRIGGER IF EXISTS prevent_locked_credit_note_update ON credit_notes;
CREATE TRIGGER prevent_locked_credit_note_update
BEFORE UPDATE ON credit_notes
FOR EACH ROW
WHEN (OLD.is_locked = true)
EXECUTE FUNCTION prevent_locked_document_update();

-- Fonction pour calculer le hash d'une facture
CREATE OR REPLACE FUNCTION calculate_invoice_hash(p_invoice_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_invoice RECORD;
  v_items JSONB;
  v_hash_data JSONB;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT jsonb_agg(jsonb_build_object('description', description, 'quantity', quantity,
                                      'unit_price', unit_price, 'total', total) ORDER BY id)
  INTO v_items FROM invoice_items WHERE invoice_id = p_invoice_id;

  v_hash_data := jsonb_build_object('invoice_number', v_invoice.invoice_number, 'date', v_invoice.date,
    'dentist_id', v_invoice.dentist_id, 'subtotal', v_invoice.subtotal, 'tax_rate', v_invoice.tax_rate,
    'tax_amount', v_invoice.tax_amount, 'total', v_invoice.total, 'items', v_items);

  RETURN encode(digest(v_hash_data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer le hash d'un avoir
CREATE OR REPLACE FUNCTION calculate_credit_note_hash(p_credit_note_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_credit_note RECORD;
  v_items JSONB;
  v_hash_data JSONB;
BEGIN
  SELECT * INTO v_credit_note FROM credit_notes WHERE id = p_credit_note_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit note not found'; END IF;

  SELECT jsonb_agg(jsonb_build_object('description', description, 'quantity', quantity,
                                      'unit_price', unit_price, 'total', total) ORDER BY id)
  INTO v_items FROM credit_note_items WHERE credit_note_id = p_credit_note_id;

  v_hash_data := jsonb_build_object('credit_note_number', v_credit_note.credit_note_number, 'date', v_credit_note.date,
    'dentist_id', v_credit_note.dentist_id, 'original_invoice_id', v_credit_note.original_invoice_id,
    'subtotal', v_credit_note.subtotal, 'tax_rate', v_credit_note.tax_rate,
    'tax_amount', v_credit_note.tax_amount, 'total', v_credit_note.total, 'items', v_items);

  RETURN encode(digest(v_hash_data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;