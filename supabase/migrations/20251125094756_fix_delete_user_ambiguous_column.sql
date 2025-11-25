/*
  # Fix ambiguous column reference in delete function

  1. Changes
    - Corrige la requête DELETE qui a une colonne ambiguë
    - Qualifie correctement admin_user_id dans la table admin_impersonation_sessions
*/

CREATE OR REPLACE FUNCTION public.delete_user_and_all_data(
  target_user_id uuid,
  admin_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_profile_name TEXT;
  v_account_type TEXT;
  v_deleted_count INT := 0;
  v_admin_id UUID;
BEGIN
  -- Déterminer l'ID de l'admin (soit passé en paramètre, soit auth.uid())
  v_admin_id := COALESCE(admin_user_id, auth.uid());

  -- Vérifier que l'utilisateur est super admin (si admin_id fourni)
  IF v_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = v_admin_id 
      AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only super admins can delete users';
    END IF;

    -- Ne pas permettre de supprimer son propre compte
    IF v_admin_id = target_user_id THEN
      RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
  END IF;

  -- Déterminer le type de compte
  SELECT laboratory_name INTO v_profile_name
  FROM profiles
  WHERE id = target_user_id;

  IF v_profile_name IS NOT NULL THEN
    v_account_type := 'laboratory';
  ELSE
    SELECT name INTO v_profile_name
    FROM dentist_accounts
    WHERE id = target_user_id;

    IF v_profile_name IS NOT NULL THEN
      v_account_type := 'dentist';
    ELSE
      v_account_type := 'unknown';
      v_profile_name := 'Unknown';
    END IF;
  END IF;

  -- Supprimer toutes les données associées (ordre important)

  -- Tables liées à user_profiles (FIX: qualifie admin_user_id correctement)
  DELETE FROM admin_impersonation_sessions 
  WHERE admin_impersonation_sessions.admin_user_id = target_user_id 
     OR admin_impersonation_sessions.target_user_id = target_user_id;
  
  DELETE FROM dentist_notifications WHERE laboratory_id = target_user_id;
  DELETE FROM dentist_quote_requests WHERE laboratory_id = target_user_id;
  DELETE FROM onboarding_progress WHERE user_id = target_user_id;
  DELETE FROM photo_submissions WHERE laboratory_id = target_user_id OR dentist_id = target_user_id;
  DELETE FROM quote_requests WHERE laboratory_id = target_user_id;
  DELETE FROM referral_rewards WHERE user_id = target_user_id;
  DELETE FROM referrals WHERE referee_id = target_user_id OR referrer_id = target_user_id;
  DELETE FROM subscription_invoices WHERE user_id = target_user_id;
  DELETE FROM work_comments WHERE user_id = target_user_id;

  -- Mettre à NULL les champs historiques
  UPDATE delivery_note_stages SET completed_by = NULL WHERE completed_by = target_user_id;
  UPDATE work_assignments SET assigned_by = NULL WHERE assigned_by = target_user_id;
  UPDATE user_profiles SET impersonated_by = NULL WHERE impersonated_by = target_user_id;

  -- Tables liées à profiles
  DELETE FROM archived_documents WHERE laboratory_id = target_user_id;
  DELETE FROM audit_log WHERE laboratory_id = target_user_id;
  DELETE FROM credit_notes WHERE user_id = target_user_id;
  DELETE FROM data_seals WHERE laboratory_id = target_user_id;
  DELETE FROM delivery_notes WHERE user_id = target_user_id OR dentist_id = target_user_id;
  DELETE FROM dentist_favorite_laboratories WHERE laboratory_profile_id = target_user_id OR dentist_id = target_user_id;
  DELETE FROM dentists WHERE user_id = target_user_id OR id = target_user_id;
  DELETE FROM digital_certificates WHERE laboratory_id = target_user_id;
  DELETE FROM fiscal_periods WHERE laboratory_id = target_user_id;
  DELETE FROM help_replies WHERE user_id = target_user_id;
  DELETE FROM help_topics WHERE user_id = target_user_id;
  DELETE FROM help_votes WHERE user_id = target_user_id;
  DELETE FROM invoices WHERE user_id = target_user_id;
  DELETE FROM laboratory_employees WHERE laboratory_profile_id = target_user_id OR user_profile_id = target_user_id;
  DELETE FROM laboratory_role_permissions WHERE laboratory_profile_id = target_user_id;
  DELETE FROM proformas WHERE user_id = target_user_id;
  DELETE FROM stl_files WHERE laboratory_id = target_user_id OR dentist_id = target_user_id;
  DELETE FROM user_extensions WHERE profile_id = target_user_id;

  -- Supprimer dentist_accounts si applicable
  DELETE FROM dentist_accounts WHERE id = target_user_id;

  -- Supprimer profiles si applicable
  DELETE FROM profiles WHERE id = target_user_id;

  -- Supprimer user_profiles si applicable
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- Construire le résultat
  v_result := json_build_object(
    'success', true,
    'account_type', v_account_type,
    'account_name', v_profile_name,
    'user_id', target_user_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user: %', SQLERRM;
END;
$$;
