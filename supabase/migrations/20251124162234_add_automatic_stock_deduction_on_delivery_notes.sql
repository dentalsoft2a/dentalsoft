/*
  # Déduction automatique du stock lors de la création de bons de livraison

  1. Fonctionnalité
    - Crée un trigger qui déduit automatiquement le stock des ressources
    - Se déclenche quand un bon de livraison est créé ou mis à jour
    - Calcule les ressources nécessaires basé sur catalog_item_resources
    - Met à jour le stock des ressources et crée des mouvements de stock

  2. Tables affectées
    - delivery_notes: trigger sur INSERT/UPDATE
    - catalog_item_resources: lecture pour obtenir les ressources nécessaires
    - resources: mise à jour du stock
    - stock_movements: création des mouvements de stock

  3. Logique
    - Pour chaque item du bon de livraison (proforma_items)
    - Si l'item a un catalog_item_id
    - Récupère toutes les ressources liées dans catalog_item_resources
    - Déduit: quantity_needed * quantity de l'item du bon
    - Crée un mouvement de stock pour traçabilité
*/

-- Fonction pour déduire le stock automatiquement
CREATE OR REPLACE FUNCTION deduct_stock_for_delivery_note()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_resource RECORD;
  v_quantity_to_deduct NUMERIC;
BEGIN
  -- Parcourir tous les items du bon de livraison
  FOR v_item IN 
    SELECT pi.catalog_item_id, pi.quantity
    FROM proforma_items pi
    WHERE pi.delivery_note_id = NEW.id
      AND pi.catalog_item_id IS NOT NULL
  LOOP
    -- Pour chaque ressource nécessaire à cet article
    FOR v_resource IN
      SELECT cir.resource_id, cir.quantity_needed, r.stock_quantity, r.track_stock
      FROM catalog_item_resources cir
      JOIN resources r ON r.id = cir.resource_id
      WHERE cir.catalog_item_id = v_item.catalog_item_id
        AND r.track_stock = true
        AND r.is_active = true
    LOOP
      -- Calculer la quantité à déduire
      v_quantity_to_deduct := v_resource.quantity_needed * v_item.quantity;
      
      -- Mettre à jour le stock de la ressource
      UPDATE resources
      SET stock_quantity = stock_quantity - v_quantity_to_deduct
      WHERE id = v_resource.resource_id;
      
      -- Créer un mouvement de stock pour traçabilité
      INSERT INTO stock_movements (
        resource_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        delivery_note_id,
        notes,
        user_id
      ) VALUES (
        v_resource.resource_id,
        'out',
        v_quantity_to_deduct,
        'delivery_note',
        NEW.id,
        NEW.id,
        'Déduction automatique pour bon de livraison ' || NEW.delivery_number,
        NEW.user_id
      );
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui se déclenche APRÈS l'insertion d'un bon de livraison
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_delivery_note ON delivery_notes;
CREATE TRIGGER trigger_deduct_stock_on_delivery_note
  AFTER INSERT ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION deduct_stock_for_delivery_note();

-- Note: Le trigger ne se déclenche que sur INSERT car les bons de livraison ne doivent pas être modifiés après création
-- Si vous modifiez un bon de livraison existant, il faudra gérer manuellement les mouvements de stock