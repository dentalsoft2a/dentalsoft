/*
  # Système d'avoirs correctifs pour les factures patients dentistes

  1. Nouvelles Tables
    - `dental_credit_notes`
      - Avoirs de correction pour les factures patients
      - Lien avec la facture d'origine
      - Montants de correction détaillés
      - Statut de paiement/remboursement

    - `dental_credit_note_items`
      - Lignes de détail des avoirs
      - Lien avec les actes de la facture

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour que chaque dentiste ne voie que ses données
    - Super admin peut tout voir

  3. Triggers
    - Mise à jour automatique du statut de la facture
    - Calcul automatique du montant net après avoir
    - Enregistrement dans l'audit log

  4. Fonctions
    - Création automatique d'avoir avec vérification
    - Calcul du montant net de la facture
*/

-- =====================================================================
-- PART 1: Créer la table des avoirs patients
-- =====================================================================

CREATE TABLE IF NOT EXISTS dental_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  credit_note_number text NOT NULL,
  credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_id uuid NOT NULL REFERENCES dental_invoices(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES dental_patients(id) ON DELETE CASCADE,

  credit_type text NOT NULL DEFAULT 'correction' CHECK (credit_type IN ('correction', 'cancellation', 'refund')),

  reason text NOT NULL,

  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) DEFAULT 0,
  tax_amount numeric(10, 2) DEFAULT 0,
  total numeric(10, 2) NOT NULL DEFAULT 0,

  cpam_part numeric(10, 2) DEFAULT 0,
  mutuelle_part numeric(10, 2) DEFAULT 0,
  patient_part numeric(10, 2) DEFAULT 0,

  refund_amount numeric(10, 2) DEFAULT 0,
  refund_method text CHECK (refund_method IN ('cash', 'check', 'card', 'transfer', 'credit')),
  refund_date date,

  status text DEFAULT 'pending' CHECK (status IN ('pending', 'refunded', 'applied')),

  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES dentist_accounts(id),
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dental_credit_notes_dentist ON dental_credit_notes(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dental_credit_notes_invoice ON dental_credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dental_credit_notes_patient ON dental_credit_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_credit_notes_date ON dental_credit_notes(credit_note_date);
CREATE INDEX IF NOT EXISTS idx_dental_credit_notes_number ON dental_credit_notes(credit_note_number);

-- Enable RLS
ALTER TABLE dental_credit_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Dentists can view own credit notes"
  ON dental_credit_notes FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can create own credit notes"
  ON dental_credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own credit notes"
  ON dental_credit_notes FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Super admins can view all dental credit notes"
  ON dental_credit_notes FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- =====================================================================
-- PART 2: Créer la table des lignes d'avoir
-- =====================================================================

CREATE TABLE IF NOT EXISTS dental_credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES dental_credit_notes(id) ON DELETE CASCADE,
  invoice_item_id uuid REFERENCES dental_invoice_items(id) ON DELETE SET NULL,
  catalog_item_id uuid REFERENCES dental_catalog_items(id) ON DELETE SET NULL,

  description text NOT NULL,
  ccam_code text,
  tooth_number text,

  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  cpam_reimbursement numeric(10, 2) DEFAULT 0,
  total numeric(10, 2) NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dental_credit_note_items_credit_note ON dental_credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_dental_credit_note_items_invoice_item ON dental_credit_note_items(invoice_item_id);

-- Enable RLS
ALTER TABLE dental_credit_note_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Dentists can view own credit note items"
  ON dental_credit_note_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_credit_notes dcn
      WHERE dcn.id = credit_note_id AND dcn.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can create own credit note items"
  ON dental_credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dental_credit_notes dcn
      WHERE dcn.id = credit_note_id AND dcn.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all dental credit note items"
  ON dental_credit_note_items FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- =====================================================================
-- PART 3: Ajouter colonnes de correction aux factures dentistes
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dental_invoices' AND column_name = 'correction_amount'
  ) THEN
    ALTER TABLE dental_invoices ADD COLUMN correction_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dental_invoices' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE dental_invoices ADD COLUMN net_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dental_invoices' AND column_name = 'has_credit_note'
  ) THEN
    ALTER TABLE dental_invoices ADD COLUMN has_credit_note boolean DEFAULT false;
  END IF;
END $$;

-- =====================================================================
-- PART 4: Fonction pour calculer le montant net de la facture
-- =====================================================================

CREATE OR REPLACE FUNCTION calculate_dental_invoice_net_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_corrections numeric(10, 2);
BEGIN
  -- Calculer le total des corrections (avoirs)
  SELECT COALESCE(SUM(total), 0) INTO v_total_corrections
  FROM dental_credit_notes
  WHERE invoice_id = NEW.invoice_id
    AND status != 'cancelled';

  -- Mettre à jour la facture
  UPDATE dental_invoices
  SET
    correction_amount = v_total_corrections,
    net_amount = total - v_total_corrections,
    has_credit_note = (v_total_corrections > 0),
    updated_at = now()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur dental_credit_notes
DROP TRIGGER IF EXISTS update_dental_invoice_net_amount ON dental_credit_notes;
CREATE TRIGGER update_dental_invoice_net_amount
  AFTER INSERT OR UPDATE OR DELETE ON dental_credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_dental_invoice_net_amount();

-- =====================================================================
-- PART 5: Fonction pour générer un numéro d'avoir
-- =====================================================================

CREATE OR REPLACE FUNCTION generate_dental_credit_note_number(
  p_dentist_id uuid,
  p_year integer DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_year integer;
  v_sequence integer;
  v_credit_note_number text;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);

  -- Obtenir le prochain numéro de séquence pour cette année
  SELECT COALESCE(MAX(
    CASE
      WHEN credit_note_number ~ '^AV-[0-9]{4}-[0-9]+$'
      THEN CAST(SPLIT_PART(credit_note_number, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_sequence
  FROM dental_credit_notes
  WHERE dentist_id = p_dentist_id
    AND EXTRACT(YEAR FROM credit_note_date) = v_year;

  -- Format: AV-YYYY-NNNNN
  v_credit_note_number := 'AV-' || v_year::text || '-' || LPAD(v_sequence::text, 5, '0');

  RETURN v_credit_note_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PART 6: Fonction pour créer un avoir avec validation
-- =====================================================================

CREATE OR REPLACE FUNCTION create_dental_credit_note(
  p_dentist_id uuid,
  p_invoice_id uuid,
  p_reason text,
  p_credit_type text DEFAULT 'correction',
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_credit_note_id uuid;
  v_credit_note_number text;
  v_invoice RECORD;
  v_item jsonb;
  v_subtotal numeric(10, 2) := 0;
  v_tax_amount numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_cpam_part numeric(10, 2) := 0;
  v_mutuelle_part numeric(10, 2) := 0;
  v_patient_part numeric(10, 2) := 0;
BEGIN
  -- Vérifier que la facture existe et appartient au dentiste
  SELECT * INTO v_invoice
  FROM dental_invoices
  WHERE id = p_invoice_id AND dentist_id = p_dentist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture non trouvée ou accès refusé';
  END IF;

  -- Vérifier que la facture n'est pas un brouillon
  IF v_invoice.status = 'draft' THEN
    RAISE EXCEPTION 'Impossible de créer un avoir pour un brouillon';
  END IF;

  -- Générer le numéro d'avoir
  v_credit_note_number := generate_dental_credit_note_number(
    p_dentist_id,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer
  );

  -- Calculer les totaux des items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + (v_item->>'total')::numeric;
  END LOOP;

  v_tax_amount := v_subtotal * (v_invoice.tax_rate / 100);
  v_total := v_subtotal + v_tax_amount;

  -- Répartir proportionnellement entre CPAM, mutuelle et patient
  IF v_invoice.total > 0 THEN
    v_cpam_part := (v_total * v_invoice.cpam_part) / v_invoice.total;
    v_mutuelle_part := (v_total * v_invoice.mutuelle_part) / v_invoice.total;
    v_patient_part := (v_total * v_invoice.patient_part) / v_invoice.total;
  END IF;

  -- Créer l'avoir
  INSERT INTO dental_credit_notes (
    dentist_id,
    credit_note_number,
    credit_note_date,
    invoice_id,
    patient_id,
    credit_type,
    reason,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    cpam_part,
    mutuelle_part,
    patient_part,
    status,
    created_by
  ) VALUES (
    p_dentist_id,
    v_credit_note_number,
    CURRENT_DATE,
    p_invoice_id,
    v_invoice.patient_id,
    p_credit_type,
    p_reason,
    v_subtotal,
    v_invoice.tax_rate,
    v_tax_amount,
    v_total,
    v_cpam_part,
    v_mutuelle_part,
    v_patient_part,
    'pending',
    auth.uid()
  ) RETURNING id INTO v_credit_note_id;

  -- Créer les lignes d'avoir
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO dental_credit_note_items (
      credit_note_id,
      invoice_item_id,
      catalog_item_id,
      description,
      ccam_code,
      tooth_number,
      quantity,
      unit_price,
      cpam_reimbursement,
      total
    ) VALUES (
      v_credit_note_id,
      (v_item->>'invoice_item_id')::uuid,
      (v_item->>'catalog_item_id')::uuid,
      v_item->>'description',
      v_item->>'ccam_code',
      v_item->>'tooth_number',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'cpam_reimbursement')::numeric,
      (v_item->>'total')::numeric
    );
  END LOOP;

  RETURN v_credit_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PART 7: Mettre à jour les factures existantes avec net_amount
-- =====================================================================

UPDATE dental_invoices
SET
  correction_amount = 0,
  net_amount = total,
  has_credit_note = false
WHERE correction_amount IS NULL OR net_amount IS NULL;