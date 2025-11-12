/*
  # Ajouter le champ prescription_date à la table quote_requests

  1. Modifications
    - Ajout de la colonne `prescription_date` (date) à la table quote_requests
    - Ce champ stocke la date de prescription du travail dentaire
    - Champ nullable pour maintenir la compatibilité avec les données existantes

  2. Notes
    - La date de prescription est importante pour la conformité médicale et la traçabilité
    - Elle sera affichée sur les documents PDF générés (bons de livraison, certificats)
    - Les nouvelles demandes devront inclure cette date (validation côté frontend)
*/

-- Ajouter la colonne prescription_date à quote_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'prescription_date'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN prescription_date date;
  END IF;
END $$;
