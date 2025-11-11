/*
  # Fix delivery note progress trigger security

  1. Changes
    - Recreate update_delivery_note_progress_trigger with SECURITY DEFINER
    - This allows the trigger to update delivery_notes even when executed by employees
    - The trigger needs elevated permissions to automatically update progress

  2. Security
    - SECURITY DEFINER runs the function with owner permissions
    - This is safe because the function only updates progress_percentage and current_stage_id
    - The trigger is only called when delivery_note_stages changes
*/

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_delivery_note_progress_trigger()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
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
    AND ps.is_active = true
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
$$ LANGUAGE plpgsql;

-- Also fix the calculate_delivery_note_progress function if needed
CREATE OR REPLACE FUNCTION calculate_delivery_note_progress(p_delivery_note_id uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_weight integer;
  v_completed_weight integer;
  v_progress integer;
BEGIN
  -- Get total weight of all stages for this laboratory
  SELECT COALESCE(SUM(ps.weight), 0) INTO v_total_weight
  FROM production_stages ps
  INNER JOIN delivery_notes dn ON dn.user_id = ps.user_id
  WHERE dn.id = p_delivery_note_id
    AND ps.is_active = true;

  -- Get weight of completed stages
  SELECT COALESCE(SUM(ps.weight), 0) INTO v_completed_weight
  FROM delivery_note_stages dns
  INNER JOIN production_stages ps ON ps.id = dns.stage_id
  WHERE dns.delivery_note_id = p_delivery_note_id
    AND dns.is_completed = true
    AND ps.is_active = true;

  -- Calculate percentage
  IF v_total_weight > 0 THEN
    v_progress := ROUND((v_completed_weight::numeric / v_total_weight::numeric) * 100);
  ELSE
    v_progress := 0;
  END IF;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;
