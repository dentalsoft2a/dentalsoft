/*
  # Create admin functions for dentist subscription management
  
  1. New Functions
    - `admin_extend_dentist_subscription(dentist_id, months)` - Extends subscription by X months
    - `admin_cancel_dentist_subscription(dentist_id)` - Cancels subscription immediately
    - `admin_reset_dentist_trial(dentist_id)` - Resets trial to allow using it again
    - `admin_activate_dentist_subscription(dentist_id, plan_id, months)` - Manually activates subscription
  
  2. Security
    - All functions are SECURITY DEFINER
    - Only super admins can call these functions
    - Functions check user permissions before executing
  
  3. Audit
    - All actions are logged to audit_log table
*/

-- Function to extend dentist subscription
CREATE OR REPLACE FUNCTION admin_extend_dentist_subscription(
  p_dentist_id uuid,
  p_months integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_current_end_date timestamptz;
  v_new_end_date timestamptz;
BEGIN
  -- Get current user ID
  v_admin_id := auth.uid();
  
  -- Check if user is super admin
  IF NOT is_super_admin(v_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Accès refusé - Super Admin uniquement'
    );
  END IF;

  -- Get current subscription end date
  SELECT subscription_end_date INTO v_current_end_date
  FROM dentist_accounts
  WHERE id = p_dentist_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Compte dentiste non trouvé'
    );
  END IF;

  -- Calculate new end date
  IF v_current_end_date IS NULL OR v_current_end_date < now() THEN
    v_new_end_date := now() + (p_months || ' months')::interval;
  ELSE
    v_new_end_date := v_current_end_date + (p_months || ' months')::interval;
  END IF;

  -- Update subscription
  UPDATE dentist_accounts
  SET
    subscription_end_date = v_new_end_date,
    subscription_status = 'active',
    subscription_start_date = COALESCE(subscription_start_date, now())
  WHERE id = p_dentist_id;

  -- Log action
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, changes)
  VALUES (
    'dentist_subscription',
    p_dentist_id,
    'admin_extend',
    v_admin_id,
    jsonb_build_object(
      'months_added', p_months,
      'new_end_date', v_new_end_date,
      'admin_id', v_admin_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Abonnement prolongé de ' || p_months || ' mois',
    'new_end_date', v_new_end_date
  );
END;
$$;

-- Function to cancel dentist subscription
CREATE OR REPLACE FUNCTION admin_cancel_dentist_subscription(p_dentist_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT is_super_admin(v_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Accès refusé - Super Admin uniquement'
    );
  END IF;

  -- Update subscription to expired
  UPDATE dentist_accounts
  SET
    subscription_status = 'expired',
    subscription_end_date = now(),
    stripe_subscription_id = NULL
  WHERE id = p_dentist_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Compte dentiste non trouvé'
    );
  END IF;

  -- Log action
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, changes)
  VALUES (
    'dentist_subscription',
    p_dentist_id,
    'admin_cancel',
    v_admin_id,
    jsonb_build_object('admin_id', v_admin_id, 'cancelled_at', now())
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Abonnement résilié avec succès'
  );
END;
$$;

-- Function to reset dentist trial
CREATE OR REPLACE FUNCTION admin_reset_dentist_trial(p_dentist_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT is_super_admin(v_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Accès refusé - Super Admin uniquement'
    );
  END IF;

  -- Reset trial fields
  UPDATE dentist_accounts
  SET
    trial_used = false,
    trial_start_date = NULL,
    trial_end_date = NULL,
    subscription_status = 'none',
    subscription_start_date = NULL,
    subscription_end_date = NULL
  WHERE id = p_dentist_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Compte dentiste non trouvé'
    );
  END IF;

  -- Log action
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, changes)
  VALUES (
    'dentist_subscription',
    p_dentist_id,
    'admin_reset_trial',
    v_admin_id,
    jsonb_build_object('admin_id', v_admin_id, 'reset_at', now())
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Essai gratuit réinitialisé - Le dentiste peut maintenant activer un nouvel essai'
  );
END;
$$;

-- Function to manually activate subscription
CREATE OR REPLACE FUNCTION admin_activate_dentist_subscription(
  p_dentist_id uuid,
  p_plan_id uuid,
  p_months integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_end_date timestamptz;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT is_super_admin(v_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Accès refusé - Super Admin uniquement'
    );
  END IF;

  -- Check if plan exists
  IF NOT EXISTS (SELECT 1 FROM dentist_subscription_plans WHERE id = p_plan_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Plan d''abonnement non trouvé'
    );
  END IF;

  -- Calculate end date
  v_end_date := now() + (p_months || ' months')::interval;

  -- Activate subscription
  UPDATE dentist_accounts
  SET
    subscription_status = 'active',
    subscription_plan_id = p_plan_id,
    subscription_start_date = now(),
    subscription_end_date = v_end_date
  WHERE id = p_dentist_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Compte dentiste non trouvé'
    );
  END IF;

  -- Log action
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, changes)
  VALUES (
    'dentist_subscription',
    p_dentist_id,
    'admin_activate',
    v_admin_id,
    jsonb_build_object(
      'plan_id', p_plan_id,
      'months', p_months,
      'end_date', v_end_date,
      'admin_id', v_admin_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Abonnement activé pour ' || p_months || ' mois',
    'end_date', v_end_date
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_extend_dentist_subscription(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_cancel_dentist_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_dentist_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_activate_dentist_subscription(uuid, uuid, integer) TO authenticated;

-- Add comments
COMMENT ON FUNCTION admin_extend_dentist_subscription IS 'Super Admin only: Extends a dentist subscription by X months';
COMMENT ON FUNCTION admin_cancel_dentist_subscription IS 'Super Admin only: Immediately cancels a dentist subscription';
COMMENT ON FUNCTION admin_reset_dentist_trial IS 'Super Admin only: Resets trial status to allow dentist to use trial again';
COMMENT ON FUNCTION admin_activate_dentist_subscription IS 'Super Admin only: Manually activates a dentist subscription for X months';
