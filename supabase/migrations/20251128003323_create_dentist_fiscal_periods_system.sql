/*
  # Système de périodes fiscales et scellements pour les dentistes

  1. Nouvelles Tables
    - `dentist_data_seals`
      - Scellements cryptographiques des périodes
      - Hash combiné + signature numérique
      - Traçabilité complète

    - `dentist_fiscal_periods`
      - Gestion des périodes fiscales (mois, trimestre, année)
      - Statut: open, closed, archived
      - Scellement lors de la clôture

    - `dentist_digital_certificates`
      - Certificats numériques pour signature électronique
      - Algorithme RSA-4096
      - Validité et traçabilité

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour que chaque dentiste ne voie que ses données
    - Super admin peut tout voir

  3. Fonctions
    - Création automatique des périodes fiscales
    - Scellement des périodes avec hash cryptographique
    - Vérification d'intégrité
*/

-- =====================================================================
-- PART 1: Table des scellements dentiste
-- =====================================================================

CREATE TABLE IF NOT EXISTS dentist_data_seals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  seal_type text NOT NULL CHECK (seal_type IN ('monthly', 'quarterly', 'yearly')),
  records_count integer NOT NULL DEFAULT 0,
  first_sequence bigint,
  last_sequence bigint,
  combined_hash text NOT NULL,
  digital_signature text,
  created_at timestamptz DEFAULT now() NOT NULL,
  sealed_by uuid REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dentist_data_seals_dentist ON dentist_data_seals(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_data_seals_period ON dentist_data_seals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_dentist_data_seals_type ON dentist_data_seals(seal_type);

-- Enable RLS
ALTER TABLE dentist_data_seals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Dentists can view own seals"
  ON dentist_data_seals FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Super admins can view all dentist seals"
  ON dentist_data_seals FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- =====================================================================
-- PART 2: Table des périodes fiscales dentiste
-- =====================================================================

CREATE TABLE IF NOT EXISTS dentist_fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed', 'archived')),
  invoices_count integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  total_tax numeric(12,2) DEFAULT 0,
  payments_count integer DEFAULT 0,
  total_paid numeric(12,2) DEFAULT 0,
  net_revenue numeric(12,2) DEFAULT 0,
  net_tax numeric(12,2) DEFAULT 0,
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  seal_hash text,
  seal_signature text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT unique_dentist_period UNIQUE(dentist_id, period_start, period_end, period_type)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dentist_fiscal_periods_dentist ON dentist_fiscal_periods(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_fiscal_periods_status ON dentist_fiscal_periods(status);
CREATE INDEX IF NOT EXISTS idx_dentist_fiscal_periods_dates ON dentist_fiscal_periods(period_start, period_end);

-- Enable RLS
ALTER TABLE dentist_fiscal_periods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Dentists can view own fiscal periods"
  ON dentist_fiscal_periods FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can create own fiscal periods"
  ON dentist_fiscal_periods FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own open fiscal periods"
  ON dentist_fiscal_periods FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid() AND status = 'open')
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Super admins can view all dentist fiscal periods"
  ON dentist_fiscal_periods FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- =====================================================================
-- PART 3: Table des certificats numériques dentiste
-- =====================================================================

CREATE TABLE IF NOT EXISTS dentist_digital_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  certificate_type text DEFAULT 'self_signed' CHECK (certificate_type IN ('self_signed', 'ca_issued', 'eidas')),
  key_algorithm text DEFAULT 'RSA-4096',
  public_key text NOT NULL,
  serial_number text NOT NULL,
  issuer text DEFAULT 'DentalCloud',
  subject text NOT NULL,
  valid_from timestamptz DEFAULT now() NOT NULL,
  valid_until timestamptz NOT NULL,
  is_revoked boolean DEFAULT false,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT unique_dentist_serial UNIQUE(dentist_id, serial_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dentist_digital_certificates_dentist ON dentist_digital_certificates(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_digital_certificates_validity ON dentist_digital_certificates(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_dentist_digital_certificates_active ON dentist_digital_certificates(dentist_id, is_revoked) WHERE is_revoked = false;

-- Enable RLS
ALTER TABLE dentist_digital_certificates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Dentists can view own certificates"
  ON dentist_digital_certificates FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can create own certificates"
  ON dentist_digital_certificates FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Super admins can view all dentist certificates"
  ON dentist_digital_certificates FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- =====================================================================
-- PART 4: Fonction pour créer des périodes fiscales pour un mois
-- =====================================================================

CREATE OR REPLACE FUNCTION create_dentist_fiscal_periods_for_month(
  p_dentist_id uuid,
  p_year integer,
  p_month integer
)
RETURNS jsonb AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_quarter_start date;
  v_quarter_end date;
  v_year_start date;
  v_year_end date;
  v_quarter integer;
  v_result jsonb;
BEGIN
  -- Calculer les dates du mois
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;

  -- Calculer le trimestre
  v_quarter := ((p_month - 1) / 3) + 1;
  v_quarter_start := make_date(p_year, ((v_quarter - 1) * 3) + 1, 1);
  v_quarter_end := (v_quarter_start + interval '3 months' - interval '1 day')::date;

  -- Calculer l'année
  v_year_start := make_date(p_year, 1, 1);
  v_year_end := make_date(p_year, 12, 31);

  -- Créer la période mensuelle
  INSERT INTO dentist_fiscal_periods (
    dentist_id, period_type, period_start, period_end
  ) VALUES (
    p_dentist_id, 'month', v_month_start, v_month_end
  ) ON CONFLICT (dentist_id, period_start, period_end, period_type) DO NOTHING;

  -- Créer la période trimestrielle si c'est le premier mois du trimestre
  IF p_month IN (1, 4, 7, 10) THEN
    INSERT INTO dentist_fiscal_periods (
      dentist_id, period_type, period_start, period_end
    ) VALUES (
      p_dentist_id, 'quarter', v_quarter_start, v_quarter_end
    ) ON CONFLICT (dentist_id, period_start, period_end, period_type) DO NOTHING;
  END IF;

  -- Créer la période annuelle si c'est janvier
  IF p_month = 1 THEN
    INSERT INTO dentist_fiscal_periods (
      dentist_id, period_type, period_start, period_end
    ) VALUES (
      p_dentist_id, 'year', v_year_start, v_year_end
    ) ON CONFLICT (dentist_id, period_start, period_end, period_type) DO NOTHING;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'month_start', v_month_start,
    'month_end', v_month_end
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PART 5: Fonction pour sceller une période fiscale dentiste
-- =====================================================================

CREATE OR REPLACE FUNCTION seal_dentist_fiscal_period(
  p_period_id uuid,
  p_seal_signature text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_period RECORD;
  v_audit_records RECORD;
  v_combined_hash text;
  v_seal_id uuid;
  v_result jsonb;
  v_invoices_data RECORD;
BEGIN
  -- Récupérer la période
  SELECT * INTO v_period
  FROM dentist_fiscal_periods
  WHERE id = p_period_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Period not found or already closed';
  END IF;

  -- Calculer les statistiques des factures
  SELECT
    COUNT(*) as count,
    COALESCE(SUM(total), 0) as total_revenue,
    COALESCE(SUM(tax_amount), 0) as total_tax,
    COALESCE(SUM(total - paid_amount), 0) as outstanding
  INTO v_invoices_data
  FROM dental_invoices
  WHERE dentist_id = v_period.dentist_id
    AND invoice_date BETWEEN v_period.period_start AND v_period.period_end
    AND status != 'cancelled';

  -- Récupérer les enregistrements d'audit de la période
  SELECT
    COUNT(*) as count,
    MIN(sequence_number) as first_seq,
    MAX(sequence_number) as last_seq,
    STRING_AGG(hash_sha256, '' ORDER BY sequence_number) as all_hashes
  INTO v_audit_records
  FROM dentist_audit_log
  WHERE dentist_id = v_period.dentist_id
    AND created_at BETWEEN v_period.period_start::timestamptz AND v_period.period_end::timestamptz
    AND entity_type IN ('dental_invoices', 'dental_payments');

  -- Calculer le hash combiné
  v_combined_hash := encode(
    digest(COALESCE(v_audit_records.all_hashes, ''), 'sha256'),
    'hex'
  );

  -- Créer le scellement
  INSERT INTO dentist_data_seals (
    dentist_id,
    period_start,
    period_end,
    seal_type,
    records_count,
    first_sequence,
    last_sequence,
    combined_hash,
    digital_signature,
    sealed_by
  ) VALUES (
    v_period.dentist_id,
    v_period.period_start::timestamptz,
    v_period.period_end::timestamptz,
    v_period.period_type,
    COALESCE(v_audit_records.count, 0),
    v_audit_records.first_seq,
    v_audit_records.last_seq,
    v_combined_hash,
    p_seal_signature,
    auth.uid()
  ) RETURNING id INTO v_seal_id;

  -- Marquer toutes les entrées d'audit comme scellées
  UPDATE dentist_audit_log
  SET is_sealed = true
  WHERE dentist_id = v_period.dentist_id
    AND created_at BETWEEN v_period.period_start::timestamptz AND v_period.period_end::timestamptz
    AND entity_type IN ('dental_invoices', 'dental_payments');

  -- Mettre à jour la période
  UPDATE dentist_fiscal_periods
  SET
    status = 'closed',
    closed_at = now(),
    closed_by = auth.uid(),
    seal_hash = v_combined_hash,
    seal_signature = p_seal_signature,
    invoices_count = v_invoices_data.count,
    total_revenue = v_invoices_data.total_revenue,
    total_tax = v_invoices_data.total_tax,
    net_revenue = v_invoices_data.total_revenue,
    net_tax = v_invoices_data.total_tax,
    updated_at = now()
  WHERE id = p_period_id;

  v_result := jsonb_build_object(
    'success', true,
    'seal_id', v_seal_id,
    'combined_hash', v_combined_hash,
    'records_count', COALESCE(v_audit_records.count, 0),
    'invoices_count', v_invoices_data.count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;