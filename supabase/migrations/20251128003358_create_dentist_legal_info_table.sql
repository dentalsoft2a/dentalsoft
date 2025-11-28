/*
  # Table des informations légales des dentistes

  1. Nouvelle Table
    - `dentist_legal_info`
      - Informations légales du cabinet dentaire
      - Numéro RPPS, ADELI, SIRET
      - Coordonnées complètes du cabinet
      - Informations pour conformité factures

  2. Sécurité
    - RLS activé
    - Chaque dentiste ne peut voir/modifier que ses propres informations
    - Super admin peut tout voir
*/

-- =====================================================================
-- Table des informations légales dentiste
-- =====================================================================

CREATE TABLE IF NOT EXISTS dentist_legal_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL UNIQUE REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  
  -- Informations professionnelles
  rpps_number text,
  adeli_number text,
  ordre_number text,
  ars_region text,
  
  -- Informations entreprise
  siret_number text,
  vat_number text,
  company_name text,
  legal_form text DEFAULT 'Libéral',
  
  -- Coordonnées cabinet
  cabinet_address text,
  cabinet_postal_code text,
  cabinet_city text,
  cabinet_country text DEFAULT 'France',
  cabinet_phone text,
  cabinet_email text,
  cabinet_website text,
  
  -- Informations bancaires (pour factures)
  bank_name text,
  bank_iban text,
  bank_bic text,
  
  -- Configuration
  logo_url text,
  invoice_prefix text DEFAULT 'FACT',
  invoice_footer_text text,
  
  -- RGPD
  data_retention_years integer DEFAULT 6,
  dpo_name text,
  dpo_email text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dentist_legal_info_dentist ON dentist_legal_info(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_legal_info_rpps ON dentist_legal_info(rpps_number) WHERE rpps_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dentist_legal_info_siret ON dentist_legal_info(siret_number) WHERE siret_number IS NOT NULL;

-- Enable RLS
ALTER TABLE dentist_legal_info ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Dentists can view own legal info"
  ON dentist_legal_info FOR SELECT
  TO authenticated
  USING (dentist_id = auth.uid());

CREATE POLICY "Dentists can insert own legal info"
  ON dentist_legal_info FOR INSERT
  TO authenticated
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Dentists can update own legal info"
  ON dentist_legal_info FOR UPDATE
  TO authenticated
  USING (dentist_id = auth.uid())
  WITH CHECK (dentist_id = auth.uid());

CREATE POLICY "Super admins can view all dentist legal info"
  ON dentist_legal_info FOR SELECT
  TO authenticated
  USING (is_super_admin());