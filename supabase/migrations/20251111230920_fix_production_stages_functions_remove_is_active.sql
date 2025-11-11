/*
  # Correction des fonctions production_stages sans is_active

  1. Problème
    - Les fonctions référencent ps.is_active qui n'existe pas dans production_stages
    - Toutes les étapes sont actives par défaut (pas de colonne pour les désactiver)

  2. Solution
    - Supprimer les conditions ps.is_active = true des fonctions
    - Toutes les étapes de production existantes sont considérées comme actives

  3. Fonctions modifiées
    - calculate_delivery_note_progress
    - update_delivery_note_progress_trigger
*/

-- Fonction de calcul de progression sans is_active
CREATE OR REPLACE FUNCTION calculate_delivery_note_progress(p_delivery_note_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_stages integer;
  v_completed_stages integer;
  v_progress integer;
BEGIN
  -- Get total number of stages for this laboratory
  SELECT COUNT(*) INTO v_total_stages
  FROM production_stages ps
  INNER JOIN delivery_notes dn ON dn.user_id = ps.user_id
  WHERE dn.id = p_delivery_note_id;

  -- Get number of completed stages
  SELECT COUNT(*) INTO v_completed_stages
  FROM delivery_note_stages dns
  INNER JOIN production_stages ps ON ps.id = dns.stage_id
  WHERE dns.delivery_note_id = p_delivery_note_id
  AND dns.is_completed = true;

  -- Calculate percentage
  IF v_total_stages > 0 THEN
    v_progress := ROUND((v_completed_stages::numeric / v_total_stages::numeric) * 100);
  ELSE
    v_progress := 0;
  END IF;

  RETURN v_progress;
END;
$$;

-- Fonction trigger de mise à jour de progression sans is_active
CREATE OR REPLACE FUNCTION update_delivery_note_progress_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_progress integer;
  v_current_stage_id uuid;
BEGIN
  -- Calculate new progress
  v_progress := calculate_delivery_note_progress(NEW.delivery_note_id);

  -- Find the first incomplete stage as current stage
  SELECT ps.id INTO v_current_stage_id
  FROM production_stages ps
  LEFT JOIN delivery_note_stages dns ON dns.stage_id = ps.id AND dns.delivery_note_id = NEW.delivery_note_id
  INNER JOIN delivery_notes dn ON dn.user_id = ps.user_id
  WHERE dn.id = NEW.delivery_note_id
  AND (dns.is_completed IS NULL OR dns.is_completed = false)
  ORDER BY ps.order_index
  LIMIT 1;

  -- Update delivery note with new progress and current stage
  UPDATE delivery_notes
  SET 
    progress_percentage = v_progress,
    current_stage_id = v_current_stage_id,
    updated_at = now()
  WHERE id = NEW.delivery_note_id;

  RETURN NEW;
END;
$$;
