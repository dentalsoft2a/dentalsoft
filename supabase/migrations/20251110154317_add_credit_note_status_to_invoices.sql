/*
  # Ajout du statut 'credit_note' aux factures

  1. Changements
    - Modifier la contrainte CHECK pour ajouter 'credit_note' comme statut valide
    - Ce statut sera utilisé quand un avoir est créé pour une facture

  2. Statuts disponibles
    - 'draft' : Non payée
    - 'sent' : Envoyée
    - 'paid' : Payée
    - 'partial' : Partiellement payée
    - 'credit_note' : Avoir créé

  3. Notes
    - Le statut 'credit_note' indique qu'un avoir a été émis pour cette facture
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

-- Add new constraint with credit_note status
ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'credit_note'));
