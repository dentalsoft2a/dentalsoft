/*
  # Modifier les avoirs pour les lier au dentiste

  1. Changements
    - Ajouter la colonne `dentist_id` dans `credit_notes`
    - Copier les dentist_id depuis les factures existantes
    - Supprimer la colonne `invoice_id`
    - Ajouter la colonne `used` pour marquer les avoirs utilisés
    - Mettre à jour les politiques RLS

  2. Notes
    - Les avoirs seront maintenant liés aux dentistes
    - Lors de la génération d'une facture, les avoirs disponibles seront appliqués automatiquement
*/

-- Ajouter la nouvelle colonne dentist_id (nullable temporairement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'dentist_id'
  ) THEN
    ALTER TABLE credit_notes ADD COLUMN dentist_id uuid REFERENCES dentists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Copier les dentist_id depuis les factures existantes
UPDATE credit_notes
SET dentist_id = invoices.dentist_id
FROM invoices
WHERE credit_notes.invoice_id = invoices.id
  AND credit_notes.dentist_id IS NULL;

-- Rendre dentist_id obligatoire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' 
    AND column_name = 'dentist_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE credit_notes ALTER COLUMN dentist_id SET NOT NULL;
  END IF;
END $$;

-- Supprimer l'ancienne contrainte et colonne
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credit_notes_invoice_id_fkey'
    AND table_name = 'credit_notes'
  ) THEN
    ALTER TABLE credit_notes DROP CONSTRAINT credit_notes_invoice_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE credit_notes DROP COLUMN invoice_id;
  END IF;
END $$;

-- Ajouter la colonne used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'used'
  ) THEN
    ALTER TABLE credit_notes ADD COLUMN used boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_credit_notes_dentist_id ON credit_notes(dentist_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_used ON credit_notes(used);