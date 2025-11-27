/*
  # Create activate_dentist_trial function
  
  1. New Functions
    - `activate_dentist_trial(p_dentist_id)` - Activates a 15-day trial for a dentist
      - Checks if user is a dentist
      - Checks if trial has not been used
      - Sets subscription_status to 'trial'
      - Sets trial_start_date to now
      - Sets trial_end_date to now + 15 days
      - Sets trial_used to true
      - Returns success/error message
  
  2. Security
    - Function is SECURITY DEFINER to bypass RLS
    - Only authenticated users can call it
    - Validates dentist account exists
    - Prevents multiple trial activations
*/

CREATE OR REPLACE FUNCTION activate_dentist_trial(p_dentist_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dentist_record record;
  v_trial_end_date timestamptz;
BEGIN
  -- Check if dentist account exists
  SELECT * INTO v_dentist_record
  FROM dentist_accounts
  WHERE id = p_dentist_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Compte dentiste non trouvé'
    );
  END IF;

  -- Check if trial already used
  IF v_dentist_record.trial_used = true THEN
    RETURN json_build_object(
      'success', false,
      'message', 'L''essai gratuit a déjà été utilisé'
    );
  END IF;

  -- Check if already has an active subscription
  IF v_dentist_record.subscription_status = 'active' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Vous avez déjà un abonnement actif'
    );
  END IF;

  -- Check if currently in trial
  IF v_dentist_record.subscription_status = 'trial' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Essai gratuit déjà en cours'
    );
  END IF;

  -- Calculate trial end date (15 days from now)
  v_trial_end_date := now() + interval '15 days';

  -- Activate trial
  UPDATE dentist_accounts
  SET
    subscription_status = 'trial',
    trial_start_date = now(),
    trial_end_date = v_trial_end_date,
    subscription_end_date = v_trial_end_date,
    trial_used = true,
    updated_at = now()
  WHERE id = p_dentist_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Essai gratuit de 15 jours activé avec succès !',
    'trial_end_date', v_trial_end_date
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION activate_dentist_trial(uuid) TO authenticated;

COMMENT ON FUNCTION activate_dentist_trial IS 'Activates a 15-day free trial for a dentist account';
