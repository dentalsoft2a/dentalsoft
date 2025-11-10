/*
  # Système de scellement et périodes fiscales

  1. Nouvelles tables
    - `data_seals` - Scellements cryptographiques
    - `fiscal_periods` - Périodes fiscales (mois, trimestre, année)

  2. Fonctions
    - seal_fiscal_period() - Clôture et scellement
    - create_fiscal_periods_for_month() - Création automatique
*/

-- Table des scellements
CREATE TABLE IF NOT EXISTS data_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  seal_type TEXT NOT NULL CHECK (seal_type IN ('daily', 'monthly', 'yearly')),
  records_count INTEGER NOT NULL DEFAULT 0,
  first_sequence BIGINT,
  last_sequence BIGINT,
  combined_hash TEXT NOT NULL,
  digital_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  sealed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_data_seals_laboratory ON data_seals(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_data_seals_period ON data_seals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_data_seals_type ON data_seals(seal_type);

ALTER TABLE data_seals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seals"
  ON data_seals FOR SELECT TO authenticated
  USING (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Super admin can view all seals"
  ON data_seals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Table des périodes fiscales
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES profiles(id) NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed', 'archived')),
  invoices_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  seal_hash TEXT,
  seal_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_period UNIQUE(laboratory_id, period_start, period_end, period_type)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_laboratory ON fiscal_periods(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_status ON fiscal_periods(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON fiscal_periods(period_start, period_end);

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fiscal periods"
  ON fiscal_periods FOR SELECT TO authenticated
  USING (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own fiscal periods"
  ON fiscal_periods FOR INSERT TO authenticated
  WITH CHECK (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own open fiscal periods"
  ON fiscal_periods FOR UPDATE TO authenticated
  USING (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()) AND status = 'open')
  WITH CHECK (laboratory_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Super admin can view all fiscal periods"
  ON fiscal_periods FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Fonction pour sceller une période
CREATE OR REPLACE FUNCTION seal_fiscal_period(p_period_id UUID, p_seal_signature TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_period RECORD;
  v_audit_records RECORD;
  v_combined_hash TEXT;
  v_seal_id UUID;
  v_result JSONB;
BEGIN
  SELECT * INTO v_period FROM fiscal_periods WHERE id = p_period_id AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Period not found or already closed'; END IF;

  SELECT COUNT(*) as count, MIN(sequence_number) as first_seq, MAX(sequence_number) as last_seq,
         STRING_AGG(hash_sha256, '' ORDER BY sequence_number) as all_hashes
  INTO v_audit_records FROM audit_log
  WHERE laboratory_id = v_period.laboratory_id
    AND created_at BETWEEN v_period.period_start AND v_period.period_end
    AND entity_type IN ('invoices', 'credit_notes');

  v_combined_hash := encode(digest(COALESCE(v_audit_records.all_hashes, ''), 'sha256'), 'hex');

  INSERT INTO data_seals (laboratory_id, period_start, period_end, seal_type, records_count,
                          first_sequence, last_sequence, combined_hash, digital_signature, sealed_by)
  VALUES (v_period.laboratory_id, v_period.period_start::timestamptz, v_period.period_end::timestamptz,
          v_period.period_type, COALESCE(v_audit_records.count, 0), v_audit_records.first_seq,
          v_audit_records.last_seq, v_combined_hash, p_seal_signature, auth.uid())
  RETURNING id INTO v_seal_id;

  UPDATE audit_log SET is_sealed = true, seal_id = v_seal_id
  WHERE laboratory_id = v_period.laboratory_id
    AND created_at BETWEEN v_period.period_start AND v_period.period_end
    AND entity_type IN ('invoices', 'credit_notes');

  UPDATE fiscal_periods SET status = 'closed', closed_at = now(), closed_by = auth.uid(),
                            seal_hash = v_combined_hash, seal_signature = p_seal_signature
  WHERE id = p_period_id;

  UPDATE invoices SET is_locked = true, locked_at = now(), fiscal_period_id = p_period_id
  WHERE user_id = v_period.laboratory_id AND date BETWEEN v_period.period_start AND v_period.period_end;

  UPDATE credit_notes SET is_locked = true, locked_at = now(), fiscal_period_id = p_period_id
  WHERE user_id = v_period.laboratory_id AND date BETWEEN v_period.period_start AND v_period.period_end;

  v_result := jsonb_build_object('success', true, 'seal_id', v_seal_id, 'combined_hash', v_combined_hash,
                                  'records_count', COALESCE(v_audit_records.count, 0), 'period_closed_at', now());
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer automatiquement les périodes fiscales
CREATE OR REPLACE FUNCTION create_fiscal_periods_for_month(p_laboratory_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS UUID AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_period_id UUID;
  v_invoice_stats RECORD;
BEGIN
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  SELECT COUNT(*) as count, COALESCE(SUM(total - tax_amount), 0) as revenue,
         COALESCE(SUM(tax_amount), 0) as tax
  INTO v_invoice_stats FROM invoices
  WHERE user_id = p_laboratory_id AND date BETWEEN v_period_start AND v_period_end AND status != 'draft';

  INSERT INTO fiscal_periods (laboratory_id, period_type, period_start, period_end, status,
                               invoices_count, total_revenue, total_tax)
  VALUES (p_laboratory_id, 'month', v_period_start, v_period_end, 'open',
          v_invoice_stats.count, v_invoice_stats.revenue, v_invoice_stats.tax)
  ON CONFLICT (laboratory_id, period_start, period_end, period_type)
  DO UPDATE SET invoices_count = v_invoice_stats.count, total_revenue = v_invoice_stats.revenue,
                total_tax = v_invoice_stats.tax, updated_at = now()
  RETURNING id INTO v_period_id;

  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;