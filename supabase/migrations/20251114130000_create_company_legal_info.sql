/*
  # Create company legal information table

  1. New Table
    - `company_legal_info`
      - `id` (uuid, primary key)
      - `company_name` (text) - Raison sociale
      - `legal_form` (text) - Forme juridique (SAS, SARL, etc.)
      - `capital` (decimal) - Capital social
      - `siret` (text) - Numéro SIRET
      - `rcs` (text) - RCS + Ville
      - `vat_number` (text) - Numéro TVA intracommunautaire
      - `ape_code` (text) - Code APE/NAF
      - `address` (text) - Adresse complète du siège social
      - `phone` (text) - Téléphone
      - `email` (text) - Email général
      - `dpo_name` (text) - Nom du DPO
      - `dpo_email` (text) - Email DPO
      - `director_name` (text) - Nom du directeur de publication
      - `director_title` (text) - Fonction du directeur
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public read access for legal pages
    - Super admin write access only
*/

-- Create table
CREATE TABLE IF NOT EXISTS company_legal_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  legal_form text,
  capital decimal(12,2),
  siret text,
  rcs text,
  vat_number text,
  ape_code text,
  address text,
  phone text,
  email text,
  dpo_name text,
  dpo_email text,
  director_name text,
  director_title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_company_legal_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_legal_info_updated_at
  BEFORE UPDATE ON company_legal_info
  FOR EACH ROW
  EXECUTE FUNCTION update_company_legal_info_updated_at();

-- Enable RLS
ALTER TABLE company_legal_info ENABLE ROW LEVEL SECURITY;

-- Public read access for legal pages
CREATE POLICY "Public can view company legal info"
  ON company_legal_info
  FOR SELECT
  TO public
  USING (true);

-- Super admin can insert/update
CREATE POLICY "Super admin can insert company legal info"
  ON company_legal_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
  );

CREATE POLICY "Super admin can update company legal info"
  ON company_legal_info
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
  )
  WITH CHECK (
    is_super_admin()
  );

-- Insert default data
INSERT INTO company_legal_info (
  company_name,
  legal_form,
  capital,
  siret,
  rcs,
  vat_number,
  ape_code,
  address,
  phone,
  email,
  dpo_name,
  dpo_email,
  director_name,
  director_title
) VALUES (
  'DentalCloud',
  'SAS',
  10000.00,
  'Votre numéro SIRET',
  'RCS Paris',
  'FR12345678901',
  '6201Z',
  'Votre adresse complète',
  '+33 X XX XX XX XX',
  'contact@dentalcloud.fr',
  'Nom du DPO',
  'dpo@dentalcloud.fr',
  'Nom du Directeur',
  'Président'
)
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_legal_info_created_at ON company_legal_info(created_at DESC);
