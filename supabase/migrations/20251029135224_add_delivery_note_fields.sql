/*
  # Ajout de champs pour les bons de livraison

  ## Modifications
  
  1. Ajout de colonnes à la table `delivery_notes`
    - `prescription_date` (date) - Date de prescription
  
  2. Modification de la structure des items
    Les items stockés en JSONB contiendront maintenant :
    - description (text) - Description de l'article
    - quantity (integer) - Quantité
    - unit_price (decimal) - Prix unitaire
    - unit (text) - Unité (ex: "pièce", "set", etc.)
    - shade (text) - Teinte
    - tooth_number (text) - Numéro de dent
  
  ## Notes
  - La colonne items reste en JSONB pour plus de flexibilité
  - Compatible avec les données existantes
*/

-- Ajouter la colonne prescription_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'prescription_date'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN prescription_date date;
  END IF;
END $$;