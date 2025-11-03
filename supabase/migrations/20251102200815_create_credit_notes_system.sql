/*
  # Création du système d'avoirs (credit notes)

  1. Nouvelle table
    - `credit_notes`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence à profiles)
      - `invoice_id` (uuid, référence à invoices)
      - `credit_note_number` (text, unique, numéro de l'avoir)
      - `date` (date, date de création de l'avoir)
      - `reason` (text, raison de l'avoir)
      - `subtotal` (decimal, sous-total)
      - `tax_rate` (decimal, taux de TVA)
      - `tax_amount` (decimal, montant TVA)
      - `total` (decimal, montant total de l'avoir)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Table de liaison pour les articles d'avoir
    - `credit_note_items`
      - `id` (uuid, clé primaire)
      - `credit_note_id` (uuid, référence à credit_notes)
      - `description` (text, description de l'article)
      - `quantity` (decimal, quantité)
      - `unit_price` (decimal, prix unitaire)
      - `total` (decimal, montant total de la ligne)

  3. Sécurité
    - Enable RLS sur les deux tables
    - Politiques pour que les utilisateurs ne voient que leurs propres avoirs

  4. Trigger
    - Mise à jour automatique de updated_at
*/

-- Table des avoirs
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  credit_note_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(10, 2) NOT NULL DEFAULT 20,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des articles d'avoir
CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity decimal(10, 2) NOT NULL DEFAULT 1,
  unit_price decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

-- Policies pour credit_notes
CREATE POLICY "Users can view own credit notes"
  ON credit_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own credit notes"
  ON credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own credit notes"
  ON credit_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own credit notes"
  ON credit_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies pour credit_note_items
CREATE POLICY "Users can view own credit note items"
  ON credit_note_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own credit note items"
  ON credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own credit note items"
  ON credit_note_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own credit note items"
  ON credit_note_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
    )
  );

-- Fonction pour updated_at si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_credit_notes_user_id ON credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
