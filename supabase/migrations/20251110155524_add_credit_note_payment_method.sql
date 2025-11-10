/*
  # Ajout de la méthode de paiement 'credit_note'

  1. Changements
    - Modifier la contrainte CHECK sur payment_method pour ajouter 'credit_note'
    - Permettre d'enregistrer un paiement via avoir

  2. Méthodes de paiement disponibles
    - 'cash' : Espèces
    - 'bank_transfer' : Virement
    - 'check' : Chèque
    - 'credit_card' : Carte bancaire
    - 'credit_note' : Avoir

  3. Notes
    - Quand un avoir est appliqué à une facture, un paiement avec cette méthode est créé
*/

-- Drop existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_payments_payment_method_check'
    AND table_name = 'invoice_payments'
  ) THEN
    ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_payment_method_check;
  END IF;
END $$;

-- Add new constraint with credit_note payment method
ALTER TABLE invoice_payments 
ADD CONSTRAINT invoice_payments_payment_method_check 
CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card', 'credit_note'));
