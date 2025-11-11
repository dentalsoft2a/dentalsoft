/*
  # Fix create_default_production_stages_for_user to remove weight column

  1. Changes
    - Remove weight column from INSERT statement
    - Keep all other default stages configuration
  
  2. Impact
    - Fixes employee creation by preventing "weight column does not exist" error
    - No changes to existing data or RLS policies
*/

-- Update function to remove weight column
CREATE OR REPLACE FUNCTION public.create_default_production_stages_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create if user doesn't already have stages
  IF NOT EXISTS (SELECT 1 FROM production_stages WHERE user_id = p_user_id) THEN
    INSERT INTO production_stages (user_id, name, description, order_index, color)
    VALUES 
      (p_user_id, 'Réception', 'Réception et vérification de la commande', 1, '#8B5CF6'),
      (p_user_id, 'Préparation', 'Préparation des matériaux et outils', 2, '#3B82F6'),
      (p_user_id, 'Fabrication', 'Fabrication de la prothèse', 3, '#F59E0B'),
      (p_user_id, 'Finition', 'Finition et polissage', 4, '#10B981'),
      (p_user_id, 'Contrôle qualité', 'Contrôle qualité final', 5, '#EC4899'),
      (p_user_id, 'Prêt à livrer', 'Emballage et prêt pour livraison', 6, '#06B6D4');
  END IF;
END;
$$;