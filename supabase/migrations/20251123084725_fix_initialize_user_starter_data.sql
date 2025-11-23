/*
  # Fix initialize_user_starter_data function

  1. Changes
    - Corriger la fonction pour utiliser correctement les IDs
    - profiles.id = user_profiles.id (même UUID)
    - Le paramètre p_user_id est l'ID du user_profile (qui est aussi l'ID du profile)

  2. Notes
    - Supprime la recherche incorrecte de user_id dans profiles
    - Utilise directement p_user_id comme profile_id
*/

CREATE OR REPLACE FUNCTION initialize_user_starter_data(
  p_user_id uuid,
  p_catalog_item_ids jsonb,
  p_resource_ids jsonb,
  p_configuration jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_catalog_count integer := 0;
  v_resource_count integer := 0;
  v_dentist_id uuid;
BEGIN
  -- p_user_id est l'ID du user_profile, qui est aussi l'ID du profile
  -- Vérifier que le profil existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Copier les articles de catalogue sélectionnés
  IF jsonb_array_length(p_catalog_item_ids) > 0 THEN
    INSERT INTO catalog_items (user_id, name, description, category, unit, track_stock, stock_quantity, low_stock_threshold, created_at)
    SELECT
      p_user_id,
      pci.name,
      pci.description,
      pci.category,
      pci.default_unit,
      true,
      0,
      10,
      now()
    FROM predefined_catalog_items pci
    WHERE pci.id IN (SELECT jsonb_array_elements_text(p_catalog_item_ids)::uuid)
      AND pci.is_active = true;

    GET DIAGNOSTICS v_catalog_count = ROW_COUNT;
  END IF;

  -- Copier les ressources sélectionnées
  IF jsonb_array_length(p_resource_ids) > 0 THEN
    INSERT INTO resources (user_id, name, description, unit, track_stock, has_variants, stock_quantity, low_stock_threshold, created_at)
    SELECT
      p_user_id,
      pr.name,
      pr.description,
      pr.unit,
      true,
      pr.has_variants,
      0,
      10,
      now()
    FROM predefined_resources pr
    WHERE pr.id IN (SELECT jsonb_array_elements_text(p_resource_ids)::uuid)
      AND pr.is_active = true;

    GET DIAGNOSTICS v_resource_count = ROW_COUNT;
  END IF;

  -- Créer le premier dentiste si fourni
  IF p_configuration ? 'first_dentist' AND p_configuration->'first_dentist'->>'name' IS NOT NULL AND p_configuration->'first_dentist'->>'name' != '' THEN
    INSERT INTO dentists (user_id, name, email, phone, address, created_at)
    VALUES (
      p_user_id,
      (p_configuration->'first_dentist'->>'name')::text,
      COALESCE((p_configuration->'first_dentist'->>'email')::text, ''),
      COALESCE((p_configuration->'first_dentist'->>'phone')::text, ''),
      COALESCE((p_configuration->'first_dentist'->>'address')::text, ''),
      now()
    )
    RETURNING id INTO v_dentist_id;
  END IF;

  -- Marquer l'onboarding comme terminé
  UPDATE user_profiles
  SET onboarding_completed = true, updated_at = now()
  WHERE id = p_user_id;

  -- Finaliser la progression
  UPDATE onboarding_progress
  SET completed_at = now(), current_step = 6, updated_at = now()
  WHERE user_id = p_user_id;

  -- Retourner le résumé
  RETURN jsonb_build_object(
    'success', true,
    'catalog_items_created', v_catalog_count,
    'resources_created', v_resource_count,
    'dentist_created', v_dentist_id IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_user_starter_data(uuid, jsonb, jsonb, jsonb) TO authenticated;
