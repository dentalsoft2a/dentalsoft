/*
  # Ajout de la référence aux bons de livraison dans proforma_items

  1. Modifications
    - Ajout de la colonne `delivery_note_id` à la table `proforma_items`
      - Cette colonne relie chaque item de proforma à son bon de livraison d'origine
      - Elle est nullable car des items peuvent exister sans lien avec un bon de livraison
  
  2. Notes
    - Cette colonne permet de regrouper les items par bon de livraison lors de la génération du PDF proforma
    - La contrainte de clé étrangère assure l'intégrité référentielle
*/

-- Ajouter la colonne delivery_note_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proforma_items' AND column_name = 'delivery_note_id'
  ) THEN
    ALTER TABLE proforma_items ADD COLUMN delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE SET NULL;
  END IF;
END $$;