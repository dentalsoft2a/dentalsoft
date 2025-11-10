/*
  # Ajout du statut 'credit_note_paid' à la contrainte CHECK des factures

  1. Changements
    - Modifier la contrainte CHECK pour ajouter 'credit_note_paid' comme statut valide
    - Ce statut sera utilisé quand une facture avec avoir de correction est totalement payée

  2. Statuts disponibles
    - 'draft' : Non payée
    - 'sent' : Envoyée
    - 'paid' : Payée (sans avoir)
    - 'partial' : Partiellement payée
    - 'credit_note' : Avoir créé (non totalement payée)
    - 'credit_note_paid' : Avoir créé ET totalement payée

  3. Notes
    - Le statut 'credit_note_paid' est défini automatiquement par le trigger
    - Indique qu'une facture avec avoir de correction est entièrement réglée
*/

-- Drop existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_status_check'
    AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
  END IF;
END $$;

-- Add new constraint with credit_note_paid status
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check
CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'credit_note', 'credit_note_paid'));
