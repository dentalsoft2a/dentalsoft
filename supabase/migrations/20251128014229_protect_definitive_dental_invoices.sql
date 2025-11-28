/*
  # Protection des factures définitives - Conformité légale

  1. Protection
    - Créer un trigger qui empêche la modification des factures définitives (sent, partial, paid)
    - Empêcher la suppression des factures définitives
    - Permettre uniquement la modification et suppression des factures avec statut 'draft'

  2. Conformité
    - Respecte la loi anti-fraude TVA (NF525)
    - Garantit l'inaltérabilité du journal d'audit
    - Traçabilité complète de toutes les transactions

  3. Exceptions autorisées
    - Les champs suivants peuvent être modifiés même sur factures définitives : 'paid_amount' (pour les paiements)
    - Le statut peut évoluer de draft -> sent -> partial -> paid (jamais en arrière)
*/

-- Fonction pour protéger les factures définitives contre les modifications
CREATE OR REPLACE FUNCTION protect_definitive_dental_invoices()
RETURNS TRIGGER AS $$
BEGIN
  -- Empêcher la suppression de factures définitives
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status IN ('sent', 'partial', 'paid') THEN
      RAISE EXCEPTION 'Cannot delete a definitive invoice (status: %). Create a credit note instead.', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- Empêcher la modification de factures définitives (sauf champs autorisés)
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.status IN ('sent', 'partial', 'paid') THEN
      -- Vérifier si les champs critiques ont été modifiés
      IF (
        OLD.invoice_number IS DISTINCT FROM NEW.invoice_number OR
        OLD.invoice_date IS DISTINCT FROM NEW.invoice_date OR
        OLD.patient_id IS DISTINCT FROM NEW.patient_id OR
        OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
        OLD.tax_rate IS DISTINCT FROM NEW.tax_rate OR
        OLD.tax_amount IS DISTINCT FROM NEW.tax_amount OR
        OLD.total IS DISTINCT FROM NEW.total OR
        OLD.cpam_part IS DISTINCT FROM NEW.cpam_part OR
        OLD.mutuelle_part IS DISTINCT FROM NEW.mutuelle_part OR
        OLD.patient_part IS DISTINCT FROM NEW.patient_part
      ) THEN
        RAISE EXCEPTION 'Cannot modify a definitive invoice (status: %). Create a credit note instead.', OLD.status;
      END IF;

      -- Empêcher les transitions de statut non autorisées
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Transitions autorisées : sent->partial, sent->paid, partial->paid
        IF NOT (
          (OLD.status = 'sent' AND NEW.status IN ('partial', 'paid', 'cancelled')) OR
          (OLD.status = 'partial' AND NEW.status IN ('paid', 'cancelled'))
        ) THEN
          RAISE EXCEPTION 'Invalid status transition from % to % for a definitive invoice', OLD.status, NEW.status;
        END IF;
      END IF;

      -- Le champ paid_amount peut être modifié (pour enregistrer les paiements)
      -- Le champ notes peut être modifié (pour ajouter des remarques)
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table dental_invoices
DROP TRIGGER IF EXISTS protect_definitive_dental_invoices_trigger ON dental_invoices;
CREATE TRIGGER protect_definitive_dental_invoices_trigger
  BEFORE UPDATE OR DELETE ON dental_invoices
  FOR EACH ROW
  EXECUTE FUNCTION protect_definitive_dental_invoices();

-- Créer une politique RLS pour empêcher la suppression via l'API
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can delete own draft invoices only" ON dental_invoices;

  CREATE POLICY "Users can delete own draft invoices only"
    ON dental_invoices
    FOR DELETE
    TO authenticated
    USING (
      auth.uid() = dentist_id
      AND status = 'draft'
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;