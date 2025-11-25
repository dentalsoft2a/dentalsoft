/*
  # Déduction intelligente du stock lors de la gestion des bons de livraison

  1. Fonctionnalité
    - Déduit automatiquement le stock lors de la création d'un bon de livraison
    - Gère intelligemment les modifications en restaurant puis redéduisant le stock
    - Supporte les ressources avec variantes
    - Crée des mouvements de stock pour traçabilité complète

  2. Tables affectées
    - delivery_notes: trigger sur INSERT/UPDATE
    - resources: mise à jour du stock
    - resource_variants: mise à jour du stock des variantes
    - stock_movements: création des mouvements de stock

  3. Logique
    - À l'INSERT: déduit directement le stock
    - À l'UPDATE:
      1. Restaure le stock basé sur l'ancienne quantité
      2. Déduit le stock basé sur la nouvelle quantité
    - Gère les cas avec ou sans variantes
*/

-- Fonction pour traiter les items du bon de livraison et gérer le stock
CREATE OR REPLACE FUNCTION process_delivery_note_stock()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_old_item JSONB;
  v_catalog_item_id UUID;
  v_quantity INTEGER;
  v_old_quantity INTEGER;
  v_resource_link RECORD;
  v_resource RECORD;
  v_variant_id UUID;
  v_quantity_to_deduct NUMERIC;
  v_old_quantity_to_restore NUMERIC;
BEGIN
  -- Si c'est une mise à jour, restaurer le stock de l'ancien état
  IF TG_OP = 'UPDATE' THEN
    -- Parcourir les anciens items pour restaurer le stock
    FOR v_old_item IN SELECT * FROM jsonb_array_elements(OLD.items)
    LOOP
      v_catalog_item_id := (v_old_item->>'catalog_item_id')::UUID;
      v_old_quantity := (v_old_item->>'quantity')::INTEGER;
      v_variant_id := (v_old_item->>'resource_variant_id')::UUID;

      IF v_catalog_item_id IS NOT NULL AND v_old_quantity > 0 THEN
        -- Restaurer le stock pour chaque ressource liée
        FOR v_resource_link IN
          SELECT cir.resource_id, cir.quantity_needed
          FROM catalog_item_resources cir
          WHERE cir.catalog_item_id = v_catalog_item_id
        LOOP
          -- Récupérer les infos de la ressource
          SELECT * INTO v_resource
          FROM resources
          WHERE id = v_resource_link.resource_id
            AND track_stock = true
            AND is_active = true;

          IF FOUND THEN
            v_old_quantity_to_restore := v_resource_link.quantity_needed * v_old_quantity;

            -- Si la ressource utilise des variantes et qu'une variante est spécifiée
            IF v_resource.has_variants AND v_variant_id IS NOT NULL THEN
              -- Restaurer le stock de la variante
              UPDATE resource_variants
              SET stock_quantity = stock_quantity + v_old_quantity_to_restore
              WHERE id = v_variant_id;

              -- Créer un mouvement de stock pour la restauration
              INSERT INTO stock_movements (
                resource_id,
                variant_id,
                movement_type,
                quantity,
                reference_type,
                reference_id,
                delivery_note_id,
                notes,
                user_id
              ) VALUES (
                v_resource_link.resource_id,
                v_variant_id,
                'in',
                v_old_quantity_to_restore,
                'delivery_note_update',
                NEW.id,
                NEW.id,
                'Restauration stock avant modification BL ' || NEW.delivery_number,
                NEW.user_id
              );
            ELSE
              -- Restaurer le stock principal de la ressource
              UPDATE resources
              SET stock_quantity = stock_quantity + v_old_quantity_to_restore
              WHERE id = v_resource_link.resource_id;

              -- Créer un mouvement de stock pour la restauration
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
                v_resource_link.resource_id,
                'in',
                v_old_quantity_to_restore,
                'delivery_note_update',
                NEW.id,
                NEW.id,
                'Restauration stock avant modification BL ' || NEW.delivery_number,
                NEW.user_id
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- Déduire le stock pour le nouvel état (INSERT ou UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    v_catalog_item_id := (v_item->>'catalog_item_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_variant_id := (v_item->>'resource_variant_id')::UUID;

    IF v_catalog_item_id IS NOT NULL AND v_quantity > 0 THEN
      -- Pour chaque ressource liée à cet article de catalogue
      FOR v_resource_link IN
        SELECT cir.resource_id, cir.quantity_needed
        FROM catalog_item_resources cir
        WHERE cir.catalog_item_id = v_catalog_item_id
      LOOP
        -- Récupérer les infos de la ressource
        SELECT * INTO v_resource
        FROM resources
        WHERE id = v_resource_link.resource_id
          AND track_stock = true
          AND is_active = true;

        IF FOUND THEN
          v_quantity_to_deduct := v_resource_link.quantity_needed * v_quantity;

          -- Si la ressource utilise des variantes et qu'une variante est spécifiée
          IF v_resource.has_variants AND v_variant_id IS NOT NULL THEN
            -- Déduire du stock de la variante
            UPDATE resource_variants
            SET stock_quantity = stock_quantity - v_quantity_to_deduct
            WHERE id = v_variant_id;

            -- Créer un mouvement de stock
            INSERT INTO stock_movements (
              resource_id,
              variant_id,
              movement_type,
              quantity,
              reference_type,
              reference_id,
              delivery_note_id,
              notes,
              user_id
            ) VALUES (
              v_resource_link.resource_id,
              v_variant_id,
              'out',
              v_quantity_to_deduct,
              'delivery_note',
              NEW.id,
              NEW.id,
              CASE
                WHEN TG_OP = 'UPDATE' THEN 'Déduction après modification BL ' || NEW.delivery_number
                ELSE 'Déduction automatique BL ' || NEW.delivery_number
              END,
              NEW.user_id
            );
          ELSE
            -- Déduire du stock principal de la ressource
            UPDATE resources
            SET stock_quantity = stock_quantity - v_quantity_to_deduct
            WHERE id = v_resource_link.resource_id;

            -- Créer un mouvement de stock
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
              v_resource_link.resource_id,
              'out',
              v_quantity_to_deduct,
              'delivery_note',
              NEW.id,
              NEW.id,
              CASE
                WHEN TG_OP = 'UPDATE' THEN 'Déduction après modification BL ' || NEW.delivery_number
                ELSE 'Déduction automatique BL ' || NEW.delivery_number
              END,
              NEW.user_id
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Créer le trigger pour INSERT et UPDATE
DROP TRIGGER IF EXISTS trigger_manage_stock_on_delivery_note ON delivery_notes;
CREATE TRIGGER trigger_manage_stock_on_delivery_note
  AFTER INSERT OR UPDATE OF items ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION process_delivery_note_stock();

-- Ajouter un commentaire explicatif
COMMENT ON FUNCTION process_delivery_note_stock() IS
'Gère automatiquement le stock lors de la création et modification de bons de livraison.
Restaure lancien stock avant de déduire le nouveau lors des modifications.';
