/*
  # Correction de la fonction calculate_delivery_note_progress

  1. Problème
    - La fonction utilise ps.weight qui n'existe plus dans production_stages
    - Cette fonction est appelée par le trigger lors de l'insertion/mise à jour des étapes

  2. Solution
    - Remplacer le calcul basé sur le poids par un comptage d'étapes
    - Utiliser COUNT(*) au lieu de SUM(weight)

  3. Impact
    - La progression sera calculée en pourcentage basé sur le nombre d'étapes complétées
*/

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
  -- Get total number of active stages for this laboratory
  SELECT COUNT(*) INTO v_total_stages
  FROM production_stages ps
  INNER JOIN delivery_notes dn ON dn.user_id = ps.user_id
  WHERE dn.id = p_delivery_note_id
  AND ps.is_active = true;

  -- Get number of completed stages
  SELECT COUNT(*) INTO v_completed_stages
  FROM delivery_note_stages dns
  INNER JOIN production_stages ps ON ps.id = dns.stage_id
  WHERE dns.delivery_note_id = p_delivery_note_id
  AND dns.is_completed = true
  AND ps.is_active = true;

  -- Calculate percentage
  IF v_total_stages > 0 THEN
    v_progress := ROUND((v_completed_stages::numeric / v_total_stages::numeric) * 100);
  ELSE
    v_progress := 0;
  END IF;

  RETURN v_progress;
END;
$$;
