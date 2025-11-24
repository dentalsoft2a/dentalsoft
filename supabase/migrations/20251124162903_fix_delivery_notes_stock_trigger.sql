/*
  # Correction du trigger de déduction automatique du stock

  1. Problème
    - Le trigger deduct_stock_for_delivery_note() fait référence à pi.catalog_item_id
    - Cette colonne n'existe pas dans la table proforma_items
    - Cela bloque la création de bons de livraison

  2. Solution
    - Supprimer le trigger problématique
    - Supprimer la fonction associée
    - La déduction de stock devra être gérée manuellement ou via une autre logique

  3. Note
    - Les bons de livraison utilisent une colonne JSONB "items" 
    - Pas de lien direct avec catalog_items dans proforma_items
*/

-- Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_delivery_note ON delivery_notes;

-- Supprimer la fonction
DROP FUNCTION IF EXISTS deduct_stock_for_delivery_note();
