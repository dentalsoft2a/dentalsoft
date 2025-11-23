/*
  # Système d'Onboarding Guidé pour Nouveaux Utilisateurs

  1. Tables créées
    - `onboarding_progress` : Suivi de la progression de l'onboarding
    - `onboarding_templates` : Templates prédéfinis pour différents types de laboratoires

  2. Modifications de tables existantes
    - Ajout de `onboarding_completed` et `onboarding_skipped` dans `user_profiles`

  3. Fonctions RPC
    - `initialize_user_starter_data` : Copie les articles et ressources sélectionnés
    - `get_onboarding_templates` : Récupère les templates disponibles
    - `complete_onboarding_step` : Marque une étape comme complétée

  4. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour que les utilisateurs ne voient que leurs données
*/

-- Ajouter les champs onboarding à user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_skipped'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;
END $$;

-- Table de progression de l'onboarding
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_step integer DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 6),
  completed_steps jsonb DEFAULT '[]'::jsonb,
  selected_catalog_items jsonb DEFAULT '[]'::jsonb,
  selected_resources jsonb DEFAULT '[]'::jsonb,
  configuration_data jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Table des templates d'onboarding
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('catalog', 'resource')),
  template_category text NOT NULL CHECK (template_category IN ('small', 'medium', 'large', 'essential', 'standard', 'complete', 'basic', 'advanced')),
  item_ids jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour onboarding_progress
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid()));

-- RLS Policies pour onboarding_templates
CREATE POLICY "All authenticated users can view active templates"
  ON onboarding_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage templates"
  ON onboarding_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Fonction pour récupérer les templates d'onboarding
CREATE OR REPLACE FUNCTION get_onboarding_templates(p_type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_type IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'type', t.type,
        'template_category', t.template_category,
        'item_ids', t.item_ids
      )
    )
    INTO v_result
    FROM onboarding_templates t
    WHERE t.is_active = true;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'type', t.type,
        'template_category', t.template_category,
        'item_ids', t.item_ids
      )
    )
    INTO v_result
    FROM onboarding_templates t
    WHERE t.is_active = true AND t.type = p_type;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Fonction pour initialiser les données utilisateur
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
  v_profile_id uuid;
  v_user_profile_id uuid;
  v_catalog_count integer := 0;
  v_resource_count integer := 0;
  v_dentist_id uuid;
BEGIN
  -- Récupérer les IDs des profils
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id;
  SELECT id INTO v_user_profile_id FROM user_profiles WHERE id = p_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Copier les articles de catalogue sélectionnés
  IF jsonb_array_length(p_catalog_item_ids) > 0 THEN
    INSERT INTO catalog_items (user_id, name, description, category, unit, track_stock, stock_quantity, low_stock_threshold, created_at)
    SELECT
      v_profile_id,
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
      v_profile_id,
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
  IF p_configuration ? 'first_dentist' THEN
    INSERT INTO dentists (user_id, name, email, phone, address, created_at)
    VALUES (
      v_profile_id,
      (p_configuration->'first_dentist'->>'name')::text,
      (p_configuration->'first_dentist'->>'email')::text,
      COALESCE((p_configuration->'first_dentist'->>'phone')::text, ''),
      COALESCE((p_configuration->'first_dentist'->>'address')::text, ''),
      now()
    )
    RETURNING id INTO v_dentist_id;
  END IF;

  -- Marquer l'onboarding comme terminé
  UPDATE user_profiles
  SET onboarding_completed = true, updated_at = now()
  WHERE id = v_user_profile_id;

  -- Finaliser la progression
  UPDATE onboarding_progress
  SET completed_at = now(), current_step = 6, updated_at = now()
  WHERE user_id = v_user_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'catalog_items_created', v_catalog_count,
    'resources_created', v_resource_count,
    'dentist_created', v_dentist_id IS NOT NULL
  );
END;
$$;

-- Fonction pour compléter une étape
CREATE OR REPLACE FUNCTION complete_onboarding_step(
  p_user_id uuid,
  p_step_number integer,
  p_step_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress_id uuid;
BEGIN
  -- Vérifier si une progression existe, sinon la créer
  SELECT id INTO v_progress_id FROM onboarding_progress WHERE user_id = p_user_id;

  IF v_progress_id IS NULL THEN
    INSERT INTO onboarding_progress (user_id, current_step, created_at)
    VALUES (p_user_id, p_step_number, now())
    RETURNING id INTO v_progress_id;
  END IF;

  -- Mettre à jour la progression
  UPDATE onboarding_progress
  SET current_step = GREATEST(current_step, p_step_number),
      completed_steps = jsonb_set(completed_steps, array[p_step_number::text], p_step_data),
      updated_at = now()
  WHERE id = v_progress_id;

  RETURN jsonb_build_object('success', true, 'step', p_step_number);
END;
$$;

-- Index
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_type ON onboarding_templates(type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed) WHERE onboarding_completed = false;

-- Permissions
GRANT EXECUTE ON FUNCTION get_onboarding_templates(text) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_starter_data(uuid, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding_step(uuid, integer, jsonb) TO authenticated;
