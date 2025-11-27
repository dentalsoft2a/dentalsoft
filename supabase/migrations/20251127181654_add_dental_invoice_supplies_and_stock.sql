/*
  # Ajouter gestion des fournitures et mouvements de stock pour factures dentaires

  1. Tables
    - `dental_invoice_supplies` : Fournitures utilisées dans les factures
    - `dental_stock_movements` : Mouvements de stock des fournitures dentaires

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour les dentistes seulement

  3. Indexes
    - Index sur dentist_id, resource_id, invoice_id
*/

-- Table des fournitures utilisées dans les factures
CREATE TABLE IF NOT EXISTS dental_invoice_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES dental_invoices(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES dental_resources(id) ON DELETE CASCADE,
  quantity numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des mouvements de stock pour fournitures dentaires
CREATE TABLE IF NOT EXISTS dental_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES dental_resources(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity numeric(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dental_invoice_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies pour dental_invoice_supplies
CREATE POLICY "Dentists can view their invoice supplies"
  ON dental_invoice_supplies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_supplies.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can insert their invoice supplies"
  ON dental_invoice_supplies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_supplies.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can delete their invoice supplies"
  ON dental_invoice_supplies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dental_invoices
      WHERE dental_invoices.id = dental_invoice_supplies.invoice_id
      AND dental_invoices.dentist_id = auth.uid()
    )
  );

-- Policies pour dental_stock_movements
CREATE POLICY "Dentists can view their stock movements"
  ON dental_stock_movements FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert their stock movements"
  ON dental_stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dental_invoice_supplies_invoice
  ON dental_invoice_supplies(invoice_id);

CREATE INDEX IF NOT EXISTS idx_dental_invoice_supplies_resource
  ON dental_invoice_supplies(resource_id);

CREATE INDEX IF NOT EXISTS idx_dental_stock_movements_dentist
  ON dental_stock_movements(dentist_id);

CREATE INDEX IF NOT EXISTS idx_dental_stock_movements_resource
  ON dental_stock_movements(resource_id);

CREATE INDEX IF NOT EXISTS idx_dental_stock_movements_date
  ON dental_stock_movements(created_at DESC);
