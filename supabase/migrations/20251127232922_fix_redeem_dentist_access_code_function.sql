/*
  # Fix redeem_dentist_access_code function
  
  1. Changes
    - Remove reference to non-existent column cabinet_billing_enabled
    - Simplify to only update necessary fields
    - Keep all security checks and redemption tracking
  
  2. Security
    - Function is SECURITY DEFINER to bypass RLS
    - All validation checks remain intact
*/

CREATE OR REPLACE FUNCTION redeem_dentist_access_code(p_dentist_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_subscription_start timestamptz;
  v_subscription_end timestamptz;
  v_subscription_id uuid;
BEGIN
  -- Récupérer les informations du code (insensible à la casse)
  SELECT * INTO v_code_record
  FROM dentist_access_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Code invalide ou expiré'
    );
  END IF;

  -- Vérifier le nombre d'utilisations
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.used_count >= v_code_record.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'max_uses_reached',
      'message', 'Ce code a atteint son nombre maximum d''utilisations'
    );
  END IF;

  -- Vérifier si le dentiste a déjà utilisé ce code
  IF EXISTS (
    SELECT 1 FROM dentist_access_code_redemptions
    WHERE access_code_id = v_code_record.id
      AND dentist_id = p_dentist_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_redeemed',
      'message', 'Vous avez déjà utilisé ce code'
    );
  END IF;

  -- Calculer les dates d'abonnement
  v_subscription_start := now();
  v_subscription_end := now() + (v_code_record.duration_months || ' months')::interval;

  -- Créer l'abonnement
  INSERT INTO dentist_subscriptions (
    dentist_id,
    plan_id,
    status,
    subscription_start_date,
    subscription_end_date,
    payment_method
  )
  VALUES (
    p_dentist_id,
    v_code_record.plan_id,
    'active',
    v_subscription_start,
    v_subscription_end,
    'access_code'
  )
  RETURNING id INTO v_subscription_id;

  -- Mettre à jour le compte dentiste
  UPDATE dentist_accounts
  SET
    subscription_plan_id = v_code_record.plan_id,
    subscription_status = 'active',
    subscription_start_date = v_subscription_start,
    subscription_end_date = v_subscription_end
  WHERE id = p_dentist_id;

  -- Enregistrer l'utilisation
  INSERT INTO dentist_access_code_redemptions (
    access_code_id,
    dentist_id,
    subscription_id
  )
  VALUES (
    v_code_record.id,
    p_dentist_id,
    v_subscription_id
  );

  -- Incrémenter le compteur d'utilisations
  UPDATE dentist_access_codes
  SET used_count = used_count + 1
  WHERE id = v_code_record.id;

  -- Logger l'événement
  INSERT INTO dentist_subscription_events (
    dentist_id,
    plan_id,
    event_type,
    metadata
  )
  VALUES (
    p_dentist_id,
    v_code_record.plan_id,
    'code_redeemed',
    jsonb_build_object(
      'code', p_code,
      'subscription_id', v_subscription_id,
      'duration_months', v_code_record.duration_months
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'subscription_start', v_subscription_start,
    'subscription_end', v_subscription_end,
    'duration_months', v_code_record.duration_months,
    'message', 'Code activé avec succès'
  );
END;
$$;

COMMENT ON FUNCTION redeem_dentist_access_code IS 'Allows dentists to redeem access codes to activate their subscription';
