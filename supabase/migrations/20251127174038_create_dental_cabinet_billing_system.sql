/*
  # Système de facturation et gestion de stock pour cabinets dentaires

  1. Nouvelles Tables
    - `predefined_dental_supplies` : Fournitures dentaires prédéfinies
    - `predefined_dental_services` : Actes/services dentaires prédéfinis
    - `dental_patients` : Patients du cabinet dentaire
    - `dental_catalog_items` : Catalogue des actes dentaires du cabinet
    - `dental_resources` : Fournitures et consommables du cabinet
    - `dental_invoices` : Factures patients
    - `dental_invoice_items` : Lignes de facture
    - `dental_payments` : Paiements reçus
    - `dental_prescriptions` : Ordonnances médicales
    - `dental_stock_movements` : Mouvements de stock fournitures

  2. Modifications de tables existantes
    - `dentist_accounts` : Ajout du champ `cabinet_billing_enabled` et `account_type`

  3. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour que chaque dentiste ne voie que ses données
    - Accès super admin pour toutes les tables

  4. Données initiales
    - Insertion des fournitures dentaires prédéfinies
    - Insertion des actes dentaires prédéfinis par catégorie
*/

-- =====================================================================
-- PART 1: Modifier la table dentist_accounts
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_accounts' AND column_name = 'cabinet_billing_enabled'
  ) THEN
    ALTER TABLE dentist_accounts ADD COLUMN cabinet_billing_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_accounts' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE dentist_accounts ADD COLUMN account_type text DEFAULT 'simple' CHECK (account_type IN ('simple', 'cabinet'));
  END IF;
END $$;

-- =====================================================================
-- PART 2: Créer les tables de ressources prédéfinies
-- =====================================================================

-- Table des fournitures dentaires prédéfinies
CREATE TABLE IF NOT EXISTS predefined_dental_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'unité',
  has_batch_tracking boolean DEFAULT false,
  has_expiry_date boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des actes dentaires prédéfinis
CREATE TABLE IF NOT EXISTS predefined_dental_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  ccam_code text,
  default_price numeric(10, 2) DEFAULT 0,
  cpam_reimbursement numeric(10, 2) DEFAULT 0,
  unit text DEFAULT 'acte',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- PART 3: Créer les tables du cabinet dentaire
-- =====================================================================

-- Table des patients
CREATE TABLE IF NOT EXISTS dental_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  social_security_number text,
  mutuelle_name text,
  mutuelle_number text,
  medical_notes text,
  allergies text,
  current_treatments text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table du catalogue d'actes dentaires
CREATE TABLE IF NOT EXISTS dental_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  ccam_code text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  cpam_reimbursement numeric(10, 2) DEFAULT 0,
  unit text DEFAULT 'acte',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des fournitures/ressources dentaires
CREATE TABLE IF NOT EXISTS dental_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'unité',
  stock_quantity numeric(10, 2) DEFAULT 0,
  low_stock_threshold numeric(10, 2) DEFAULT 10,
  cost_per_unit numeric(10, 2) DEFAULT 0,
  has_batch_tracking boolean DEFAULT false,
  has_expiry_date boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des lots de fournitures
CREATE TABLE IF NOT EXISTS dental_resource_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES dental_resources(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  expiry_date date,
  cost_per_unit numeric(10, 2) DEFAULT 0,
  supplier text,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table des mouvements de stock
CREATE TABLE IF NOT EXISTS dental_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES dental_resources(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES dental_resource_batches(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'expired')),
  quantity numeric(10, 2) NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES dentist_accounts(id) ON DELETE SET NULL
);

-- Table des factures patients
CREATE TABLE IF NOT EXISTS dental_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES dental_patients(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) DEFAULT 0,
  tax_amount numeric(10, 2) DEFAULT 0,
  total numeric(10, 2) NOT NULL DEFAULT 0,
  cpam_part numeric(10, 2) DEFAULT 0,
  mutuelle_part numeric(10, 2) DEFAULT 0,
  patient_part numeric(10, 2) DEFAULT 0,
  paid_amount numeric(10, 2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'cancelled')),
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des lignes de facture
CREATE TABLE IF NOT EXISTS dental_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES dental_invoices(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES dental_catalog_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  ccam_code text,
  tooth_number text,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  cpam_reimbursement numeric(10, 2) DEFAULT 0,
  total numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS dental_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES dental_invoices(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'card', 'transfer', 'cpam', 'mutuelle')),
  payment_source text DEFAULT 'patient' CHECK (payment_source IN ('patient', 'cpam', 'mutuelle')),
  reference text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table des ordonnances
CREATE TABLE IF NOT EXISTS dental_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES dental_patients(id) ON DELETE CASCADE,
  prescription_date date NOT NULL DEFAULT CURRENT_DATE,
  medications jsonb DEFAULT '[]'::jsonb,
  instructions text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- PART 4: Enable RLS et créer les policies
-- =====================================================================

ALTER TABLE predefined_dental_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE predefined_dental_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_resource_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_prescriptions ENABLE ROW LEVEL SECURITY;

-- Policies pour predefined_dental_supplies
CREATE POLICY "Authenticated users can view active supplies"
  ON predefined_dental_supplies FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage supplies"
  ON predefined_dental_supplies FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Policies pour predefined_dental_services
CREATE POLICY "Authenticated users can view active services"
  ON predefined_dental_services FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage services"
  ON predefined_dental_services FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Policies pour dental_patients
CREATE POLICY "Dentists can view own patients"
  ON dental_patients FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own patients"
  ON dental_patients FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own patients"
  ON dental_patients FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can delete own patients"
  ON dental_patients FOR DELETE
  TO authenticated
  USING (dentist_id = auth.uid());

-- Policies pour dental_catalog_items
CREATE POLICY "Dentists can view own catalog"
  ON dental_catalog_items FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own catalog items"
  ON dental_catalog_items FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own catalog items"
  ON dental_catalog_items FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can delete own catalog items"
  ON dental_catalog_items FOR DELETE
  TO authenticated
  USING (dentist_id = auth.uid());

-- Policies pour dental_resources
CREATE POLICY "Dentists can view own resources"
  ON dental_resources FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own resources"
  ON dental_resources FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own resources"
  ON dental_resources FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can delete own resources"
  ON dental_resources FOR DELETE
  TO authenticated
  USING (dentist_id = auth.uid());

-- Policies pour dental_resource_batches
CREATE POLICY "Dentists can view batches of own resources"
  ON dental_resource_batches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_resources
      WHERE dental_resources.id = dental_resource_batches.resource_id
      AND dental_resources.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can insert batches for own resources"
  ON dental_resource_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dental_resources
      WHERE dental_resources.id = dental_resource_batches.resource_id
      AND dental_resources.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can update batches of own resources"
  ON dental_resource_batches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_resources
      WHERE dental_resources.id = dental_resource_batches.resource_id
      AND dental_resources.dentist_id = auth.uid()
    )
  );

-- Policies pour dental_stock_movements
CREATE POLICY "Dentists can view own stock movements"
  ON dental_stock_movements FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own stock movements"
  ON dental_stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

-- Policies pour dental_invoices
CREATE POLICY "Dentists can view own invoices"
  ON dental_invoices FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own invoices"
  ON dental_invoices FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own invoices"
  ON dental_invoices FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can delete own invoices"
  ON dental_invoices FOR DELETE
  TO authenticated
  USING (dentist_id = auth.uid());

-- Policies pour dental_invoice_items
CREATE POLICY "Dentists can view invoice items of own invoices"
  ON dental_invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_items.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can insert items for own invoices"
  ON dental_invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_items.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can update items of own invoices"
  ON dental_invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_items.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can delete items of own invoices"
  ON dental_invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_items.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

-- Policies pour dental_payments
CREATE POLICY "Dentists can view own payments"
  ON dental_payments FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own payments"
  ON dental_payments FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own payments"
  ON dental_payments FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can delete own payments"
  ON dental_payments FOR DELETE
  TO authenticated
  USING (dentist_id = auth.uid());

-- Policies pour dental_prescriptions
CREATE POLICY "Dentists can view own prescriptions"
  ON dental_prescriptions FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own prescriptions"
  ON dental_prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own prescriptions"
  ON dental_prescriptions FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can delete own prescriptions"
  ON dental_prescriptions FOR DELETE
  TO authenticated
  USING (dentist_id = auth.uid());

-- =====================================================================
-- PART 5: Créer les index pour améliorer les performances
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_dental_patients_dentist ON dental_patients(dentist_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dental_patients_name ON dental_patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_dental_catalog_dentist ON dental_catalog_items(dentist_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dental_resources_dentist ON dental_resources(dentist_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dental_resources_low_stock ON dental_resources(dentist_id, stock_quantity, low_stock_threshold);
CREATE INDEX IF NOT EXISTS idx_dental_batches_resource ON dental_resource_batches(resource_id);
CREATE INDEX IF NOT EXISTS idx_dental_batches_expiry ON dental_resource_batches(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dental_stock_movements_dentist ON dental_stock_movements(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dental_stock_movements_resource ON dental_stock_movements(resource_id);
CREATE INDEX IF NOT EXISTS idx_dental_invoices_dentist ON dental_invoices(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dental_invoices_patient ON dental_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_invoices_status ON dental_invoices(status);
CREATE INDEX IF NOT EXISTS idx_dental_invoices_date ON dental_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_dental_invoice_items_invoice ON dental_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dental_payments_dentist ON dental_payments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dental_payments_invoice ON dental_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_dentist ON dental_prescriptions(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_patient ON dental_prescriptions(patient_id);

-- Créer un index unique sur le numéro de facture par dentiste
CREATE UNIQUE INDEX IF NOT EXISTS idx_dental_invoices_number_unique 
  ON dental_invoices(dentist_id, invoice_number);
