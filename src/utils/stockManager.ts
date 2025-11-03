import { supabase } from '../lib/supabase';

interface StockItem {
  catalogItemId: string;
  quantity: number;
  resourceVariants?: Record<string, string>;
}

export async function deductStockForDeliveryNote(
  deliveryNoteId: string,
  items: StockItem[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('🎯 deductStockForDeliveryNote called with:', { deliveryNoteId, items, userId });
  try {
    for (const item of items) {
      console.log('🔄 Processing item:', item);
      const { data: catalogItem, error: fetchError } = await supabase
        .from('catalog_items')
        .select('track_stock, stock_quantity, name, default_unit')
        .eq('id', item.catalogItemId)
        .single();

      console.log('📦 Catalog item fetched:', catalogItem, 'Error:', fetchError);

      if (fetchError) {
        console.error('Error fetching catalog item:', fetchError);
        continue;
      }

      const { data: itemResources } = await supabase
        .from('catalog_item_resources')
        .select('resource_id, quantity_needed')
        .eq('catalog_item_id', item.catalogItemId);

      console.log('🔍 Checking resources for item:', item.catalogItemId, 'Found:', itemResources);

      if (itemResources && itemResources.length > 0) {
        console.log('✅ Item uses resources, processing...');
        for (const itemResource of itemResources) {
          const resourcesNeeded = Math.floor(item.quantity / itemResource.quantity_needed);
          console.log('📊 Calculation:', item.quantity, '÷', itemResource.quantity_needed, '= floor to', resourcesNeeded);
          console.log('🔑 Resource ID:', itemResource.resource_id);
          console.log('🎨 Item resourceVariants:', item.resourceVariants);

          const { data: resource, error: resourceError } = await supabase
            .from('resources')
            .select('stock_quantity, name, user_id, has_variants')
            .eq('id', itemResource.resource_id)
            .maybeSingle();

          if (resourceError || !resource) {
            console.error('Error fetching resource:', resourceError);
            continue;
          }

          const resourceVariantId = item.resourceVariants?.[itemResource.resource_id];
          console.log('🎯 Looking for variant ID for resource:', itemResource.resource_id, '-> Found:', resourceVariantId);
          console.log('🔍 All available keys in resourceVariants:', Object.keys(item.resourceVariants || {}));
          console.log('🏷️ Resource has_variants:', resource.has_variants);

          if (resource.has_variants && !resourceVariantId) {
            return {
              success: false,
              error: `La ressource "${resource.name}" nécessite une variante, mais aucune n'a été sélectionnée.`
            };
          }

          if (resource.has_variants && resourceVariantId) {
            const { data: variant, error: variantError } = await supabase
              .from('resource_variants')
              .select('stock_quantity, variant_name')
              .eq('id', resourceVariantId)
              .maybeSingle();

            if (variantError || !variant) {
              console.error('Error fetching resource variant:', variantError);
              return { success: false, error: 'Variante de ressource non trouvée' };
            }

            const newVariantQuantity = variant.stock_quantity - resourcesNeeded;

            if (newVariantQuantity < 0) {
              return {
                success: false,
                error: `Stock insuffisant pour la variante "${variant.variant_name}" de la ressource "${resource.name}". Stock disponible: ${variant.stock_quantity}, nécessaire: ${resourcesNeeded}`
              };
            }

            console.log('💾 Updating variant:', variant.variant_name, 'from', variant.stock_quantity, 'to', newVariantQuantity);

            const { error: updateVariantError } = await supabase
              .from('resource_variants')
              .update({
                stock_quantity: newVariantQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', resourceVariantId);

            if (updateVariantError) {
              console.error('❌ Error updating variant stock:', updateVariantError);
              return { success: false, error: 'Erreur lors de la mise à jour du stock de la variante' };
            }

            console.log('✅ Variant stock updated successfully');

            const movementResult = await supabase.from('stock_movements').insert({
              resource_id: itemResource.resource_id,
              resource_variant_id: resourceVariantId,
              movement_type: 'out',
              quantity: resourcesNeeded,
              reference_type: 'delivery_note',
              reference_id: deliveryNoteId,
              notes: `Bon de livraison: ${item.quantity} ${catalogItem.default_unit} de ${catalogItem.name} (Variante: ${variant.variant_name})`,
              user_id: resource.user_id,
              created_by: userId
            });

            console.log('📝 Stock movement recorded:', movementResult.error ? movementResult.error : 'Success');
          } else if (!resource.has_variants) {
            const newResourceQuantity = resource.stock_quantity - resourcesNeeded;

            if (newResourceQuantity < 0) {
              return {
                success: false,
                error: `Stock insuffisant pour la ressource "${resource.name}". Stock disponible: ${resource.stock_quantity}, nécessaire: ${resourcesNeeded.toFixed(2)}`
              };
            }

            console.log('💾 Updating resource:', resource.name, 'from', resource.stock_quantity, 'to', newResourceQuantity);

            const { error: updateResourceError } = await supabase
              .from('resources')
              .update({
                stock_quantity: newResourceQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', itemResource.resource_id)
              .eq('user_id', resource.user_id);

            if (updateResourceError) {
              console.error('❌ Error updating resource stock:', updateResourceError);
              return { success: false, error: 'Erreur lors de la mise à jour du stock de ressource' };
            }

            console.log('✅ Resource stock updated successfully');

            const movementResult = await supabase.from('stock_movements').insert({
              resource_id: itemResource.resource_id,
              movement_type: 'out',
              quantity: resourcesNeeded,
              reference_type: 'delivery_note',
              reference_id: deliveryNoteId,
              notes: `Bon de livraison: ${item.quantity} ${catalogItem.default_unit} de ${catalogItem.name}`,
              user_id: resource.user_id,
              created_by: userId
            });

            console.log('📝 Stock movement recorded:', movementResult.error ? movementResult.error : 'Success');
          } else {
            return {
              success: false,
              error: `La ressource "${resource.name}" utilise des variantes. Veuillez sélectionner une variante.`
            };
          }
        }
      } else if (catalogItem.track_stock) {
        console.log('📦 No resources found, checking catalog item stock directly');
        const newQuantity = catalogItem.stock_quantity - item.quantity;

        if (newQuantity < 0) {
          return {
            success: false,
            error: `Stock insuffisant pour l'article. Stock disponible: ${catalogItem.stock_quantity}, demandé: ${item.quantity}`
          };
        }

        const { error: updateError } = await supabase
          .from('catalog_items')
          .update({
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.catalogItemId);

        if (updateError) {
          console.error('Error updating stock:', updateError);
          return { success: false, error: 'Erreur lors de la mise à jour du stock' };
        }
      } else {
        console.log('⚠️ No resources and track_stock is false, skipping stock management for this item');
      }

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          catalog_item_id: item.catalogItemId,
          delivery_note_id: deliveryNoteId,
          quantity: -item.quantity,
          movement_type: 'delivery_note',
          notes: `Déduction pour bon de livraison ${deliveryNoteId}`,
          created_by: userId
        });

      if (movementError) {
        console.error('Error creating stock movement:', movementError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deductStockForDeliveryNote:', error);
    return { success: false, error: 'Erreur inattendue lors de la gestion du stock' };
  }
}

export async function restoreStockForDeliveryNote(
  deliveryNoteId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Restoring stock for delivery note:', deliveryNoteId);

    const { data: catalogMovements, error: fetchCatalogError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('delivery_note_id', deliveryNoteId)
      .eq('movement_type', 'delivery_note');

    console.log('📦 Catalog movements found:', catalogMovements);

    if (fetchCatalogError) {
      console.error('Error fetching catalog stock movements:', fetchCatalogError);
      return { success: false, error: 'Erreur lors de la récupération des mouvements de stock' };
    }

    if (catalogMovements && catalogMovements.length > 0) {
      for (const movement of catalogMovements) {
        const { data: catalogItem, error: itemError } = await supabase
          .from('catalog_items')
          .select('stock_quantity')
          .eq('id', movement.catalog_item_id)
          .maybeSingle();

        if (itemError || !catalogItem) {
          console.error('Error fetching catalog item:', itemError);
          continue;
      }

      const restoredQuantity = catalogItem.stock_quantity + Math.abs(movement.quantity);

      const { error: updateError } = await supabase
        .from('catalog_items')
        .update({
          stock_quantity: restoredQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', movement.catalog_item_id);

      if (updateError) {
        console.error('Error restoring stock:', updateError);
        continue;
      }

      const { error: returnMovementError } = await supabase
        .from('stock_movements')
        .insert({
          catalog_item_id: movement.catalog_item_id,
          delivery_note_id: deliveryNoteId,
          quantity: Math.abs(movement.quantity),
          movement_type: 'return',
          notes: `Retour suite à annulation du bon de livraison ${deliveryNoteId}`,
          created_by: userId
        });

      if (returnMovementError) {
        console.error('Error creating return movement:', returnMovementError);
      }
      }
    }

    const { data: resourceMovements, error: fetchResourceError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_type', 'delivery_note')
      .eq('reference_id', deliveryNoteId)
      .eq('movement_type', 'out');

    console.log('🔧 Resource movements found:', resourceMovements);

    if (fetchResourceError) {
      console.error('Error fetching resource stock movements:', fetchResourceError);
    }

    if (resourceMovements && resourceMovements.length > 0) {
      console.log('✅ Restoring resources...');
      for (const movement of resourceMovements) {
        console.log('🔄 Processing resource movement:', movement);

        if (movement.resource_variant_id) {
          const { data: variant, error: variantError } = await supabase
            .from('resource_variants')
            .select('stock_quantity')
            .eq('id', movement.resource_variant_id)
            .maybeSingle();

          if (variantError || !variant) {
            console.error('Error fetching variant:', variantError);
            continue;
          }

          const restoredQuantity = variant.stock_quantity + movement.quantity;
          console.log('💾 Restoring variant stock from', variant.stock_quantity, 'to', restoredQuantity);

          const { error: updateError } = await supabase
            .from('resource_variants')
            .update({
              stock_quantity: restoredQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', movement.resource_variant_id);

          if (updateError) {
            console.error('Error restoring variant stock:', updateError);
            continue;
          }

          const { data: resource } = await supabase
            .from('resources')
            .select('user_id')
            .eq('id', movement.resource_id)
            .maybeSingle();

          await supabase.from('stock_movements').insert({
            resource_id: movement.resource_id,
            resource_variant_id: movement.resource_variant_id,
            movement_type: 'in',
            quantity: movement.quantity,
            reference_type: 'delivery_note',
            reference_id: deliveryNoteId,
            notes: `Retour suite à annulation du bon de livraison ${deliveryNoteId}`,
            user_id: resource?.user_id,
            created_by: userId
          });
        } else {
          const { data: resource, error: resourceError } = await supabase
            .from('resources')
            .select('stock_quantity, user_id')
            .eq('id', movement.resource_id)
            .maybeSingle();

          if (resourceError || !resource) {
            console.error('Error fetching resource:', resourceError);
            continue;
          }

          const restoredQuantity = resource.stock_quantity + movement.quantity;
          console.log('💾 Restoring resource stock from', resource.stock_quantity, 'to', restoredQuantity);

          const { error: updateError } = await supabase
            .from('resources')
            .update({
              stock_quantity: restoredQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', movement.resource_id)
            .eq('user_id', resource.user_id);

          if (updateError) {
            console.error('Error restoring resource stock:', updateError);
            continue;
          }

          await supabase.from('stock_movements').insert({
            resource_id: movement.resource_id,
            movement_type: 'in',
            quantity: movement.quantity,
            reference_type: 'delivery_note',
            reference_id: deliveryNoteId,
            notes: `Retour suite à annulation du bon de livraison ${deliveryNoteId}`,
            user_id: resource.user_id,
            created_by: userId
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreStockForDeliveryNote:', error);
    return { success: false, error: 'Erreur inattendue lors de la restauration du stock' };
  }
}

export async function adjustStock(
  catalogItemId: string,
  quantity: number,
  notes: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: catalogItem, error: fetchError } = await supabase
      .from('catalog_items')
      .select('stock_quantity, track_stock')
      .eq('id', catalogItemId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Article non trouvé' };
    }

    if (!catalogItem.track_stock) {
      return { success: false, error: 'Le suivi du stock n\'est pas activé pour cet article' };
    }

    const newQuantity = catalogItem.stock_quantity + quantity;

    if (newQuantity < 0) {
      return { success: false, error: 'Le stock ne peut pas être négatif' };
    }

    const { error: updateError } = await supabase
      .from('catalog_items')
      .update({
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId);

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour du stock' };
    }

    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        catalog_item_id: catalogItemId,
        quantity: quantity,
        movement_type: 'manual_adjustment',
        notes: notes,
        created_by: userId
      });

    if (movementError) {
      console.error('Error creating stock movement:', movementError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in adjustStock:', error);
    return { success: false, error: 'Erreur inattendue lors de l\'ajustement du stock' };
  }
}
