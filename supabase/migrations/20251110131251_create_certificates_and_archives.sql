/*
  # Certificats numériques et archivage

  1. Nouvelles tables
    - `digital_certificates` - Certificats RSA-4096
    - `archived_documents` - Archives Factur-X (6 ans minimum)

  2. Fonctions
    - calculate_retention_date() - Calcul date de rétention
    - archive_document() - Archivage automatique
*/

-- Table des certificats numériques
CREATE TABLE IF NOT EXISTS digital_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  certificate_type TEXT DEFAULT 'self_signed' NOT NULL,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  key_algorithm TEXT DEFAULT 'RSA-4096' NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT now() NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  issuer TEXT,
  subject TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digital_certificates_laboratory ON digital_certificates(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_valid ON digital_certificates(valid_until);

ALTER TABLE digital_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificate"
  ON digital_certificates FOR SELECT TO authenticated
  USING (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own certificate"
  ON digital_certificates FOR INSERT TO authenticated
  WITH CHECK (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()) AND NOT EXISTS (SELECT 1 FROM digital_certificates WHERE laboratory_id = auth.uid()));

CREATE POLICY "Super admin can view all certificates"
  ON digital_certificates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Table des documents archivés
CREATE TABLE IF NOT EXISTS archived_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'credit_note', 'proforma')),
  document_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  encryption_key_id TEXT,
  facturx_xml TEXT,
  digital_signature TEXT,
  retention_until DATE NOT NULL,
  CONSTRAINT unique_archived_document UNIQUE(laboratory_id, document_type, document_id)
);

CREATE INDEX IF NOT EXISTS idx_archived_documents_laboratory ON archived_documents(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_archived_documents_fiscal ON archived_documents(fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_archived_documents_retention ON archived_documents(retention_until);
CREATE INDEX IF NOT EXISTS idx_archived_documents_type ON archived_documents(document_type, document_id);

ALTER TABLE archived_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archived documents"
  ON archived_documents FOR SELECT TO authenticated
  USING (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create archived documents"
  ON archived_documents FOR INSERT TO authenticated
  WITH CHECK (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Super admin can view all archived documents"
  ON archived_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Fonction pour calculer la date de rétention (6 ans)
CREATE OR REPLACE FUNCTION calculate_retention_date(p_document_date DATE)
RETURNS DATE AS $$
BEGIN
  RETURN p_document_date + INTERVAL '6 years';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour archiver automatiquement un document
CREATE OR REPLACE FUNCTION archive_document(p_document_type TEXT, p_document_id UUID, p_storage_path TEXT,
  p_file_size BIGINT, p_file_hash TEXT, p_facturx_xml TEXT DEFAULT NULL, p_digital_signature TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_document RECORD;
  v_archive_id UUID;
BEGIN
  IF p_document_type = 'invoice' THEN
    SELECT user_id as laboratory_id, invoice_number as document_number, date,
           EXTRACT(YEAR FROM date)::INTEGER as fiscal_year, EXTRACT(MONTH FROM date)::INTEGER as fiscal_month
    INTO v_document FROM invoices WHERE id = p_document_id;
  ELSIF p_document_type = 'credit_note' THEN
    SELECT user_id as laboratory_id, credit_note_number as document_number, date,
           EXTRACT(YEAR FROM date)::INTEGER as fiscal_year, EXTRACT(MONTH FROM date)::INTEGER as fiscal_month
    INTO v_document FROM credit_notes WHERE id = p_document_id;
  ELSE
    RAISE EXCEPTION 'Invalid document type';
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;

  INSERT INTO archived_documents (laboratory_id, document_type, document_id, document_number, fiscal_year, fiscal_month,
                                  storage_path, file_size, file_hash, facturx_xml, digital_signature, retention_until)
  VALUES (v_document.laboratory_id, p_document_type, p_document_id, v_document.document_number,
          v_document.fiscal_year, v_document.fiscal_month, p_storage_path, p_file_size, p_file_hash,
          p_facturx_xml, p_digital_signature, calculate_retention_date(v_document.date))
  ON CONFLICT (laboratory_id, document_type, document_id)
  DO UPDATE SET storage_path = p_storage_path, file_size = p_file_size, file_hash = p_file_hash,
                facturx_xml = COALESCE(p_facturx_xml, archived_documents.facturx_xml),
                digital_signature = COALESCE(p_digital_signature, archived_documents.digital_signature),
                archived_at = now()
  RETURNING id INTO v_archive_id;

  IF p_document_type = 'invoice' THEN
    UPDATE invoices SET archived_at = now() WHERE id = p_document_id;
  ELSIF p_document_type = 'credit_note' THEN
    UPDATE credit_notes SET archived_at = now() WHERE id = p_document_id;
  END IF;

  RETURN v_archive_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;