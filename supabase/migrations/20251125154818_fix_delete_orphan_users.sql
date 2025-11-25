/*
  # Fix deletion of orphan users

  1. Changes
    - Met à jour la fonction pour gérer les utilisateurs orphelins (sans profile/dentist_account/user_profile)
    - Crée une fonction pour nettoyer les auth.users orphelins
*/

-- Fonction mise à jour pour gérer les orphelins
DROP FUNCTION IF EXISTS public.delete_user_and_all_data(uuid, uuid);

CREATE OR REPLACE FUNCTION public.delete_user_and_all_data(
  p_target_user_id uuid,
  p_admin_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_profile_name TEXT;
  v_account_type TEXT;
  v_admin_id UUID;
  v_is_orphan BOOLEAN := FALSE;
BEGIN
  -- Déterminer l'ID de l'admin (soit passé en paramètre, soit auth.uid())
  v_admin_id := COALESCE(p_admin_user_id, auth.uid());

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
    IF v_admin_id = p_target_user_id THEN
      RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
  END IF;

  -- Vérifier si l'utilisateur existe dans auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;

  -- Déterminer le type de compte
  SELECT laboratory_name INTO v_profile_name
  FROM profiles
  WHERE id = p_target_user_id;

  IF v_profile_name IS NOT NULL THEN
    v_account_type := 'laboratory';
  ELSE
    SELECT name INTO v_profile_name
    FROM dentist_accounts
    WHERE id = p_target_user_id;

    IF v_profile_name IS NOT NULL THEN
      v_account_type := 'dentist';
    ELSE
      -- Vérifier si c'est un orphelin (pas de données associées)
      IF NOT EXISTS (
        SELECT 1 FROM user_profiles WHERE id = p_target_user_id
      ) THEN
        v_is_orphan := TRUE;
        v_account_type := 'orphan';
        SELECT email INTO v_profile_name FROM auth.users WHERE id = p_target_user_id;
      ELSE
        v_account_type := 'unknown';
        v_profile_name := 'Unknown';
      END IF;
    END IF;
  END IF;

  -- Si c'est un orphelin, pas besoin de supprimer beaucoup de données
  IF NOT v_is_orphan THEN
    -- PHASE 1: Supprimer les données liées à user_profiles
    DELETE FROM admin_impersonation_sessions 
    WHERE admin_user_id = p_target_user_id 
       OR target_user_id = p_target_user_id;
    
    DELETE FROM dentist_notifications WHERE laboratory_id = p_target_user_id;
    DELETE FROM dentist_quote_requests WHERE laboratory_id = p_target_user_id;
    DELETE FROM onboarding_progress WHERE user_id = p_target_user_id;
    DELETE FROM photo_submissions WHERE laboratory_id = p_target_user_id OR dentist_id = p_target_user_id;
    DELETE FROM quote_requests WHERE laboratory_id = p_target_user_id;
    DELETE FROM referral_rewards WHERE user_id = p_target_user_id;
    DELETE FROM referrals WHERE referee_id = p_target_user_id OR referrer_id = p_target_user_id;
    DELETE FROM subscription_invoices WHERE user_id = p_target_user_id;
    DELETE FROM work_comments WHERE user_id = p_target_user_id;

    -- PHASE 2: Supprimer les données liées à profiles
    DELETE FROM archived_documents WHERE laboratory_id = p_target_user_id;
    DELETE FROM credit_notes WHERE user_id = p_target_user_id;
    DELETE FROM data_seals WHERE laboratory_id = p_target_user_id;
    DELETE FROM delivery_notes WHERE user_id = p_target_user_id OR dentist_id = p_target_user_id;
    DELETE FROM dentist_favorite_laboratories WHERE laboratory_profile_id = p_target_user_id OR dentist_id = p_target_user_id;
    DELETE FROM dentists WHERE user_id = p_target_user_id OR id = p_target_user_id;
    DELETE FROM digital_certificates WHERE laboratory_id = p_target_user_id;
    DELETE FROM fiscal_periods WHERE laboratory_id = p_target_user_id;
    DELETE FROM help_replies WHERE user_id = p_target_user_id;
    DELETE FROM help_topics WHERE user_id = p_target_user_id;
    DELETE FROM help_votes WHERE user_id = p_target_user_id;
    DELETE FROM invoices WHERE user_id = p_target_user_id;
    DELETE FROM laboratory_employees WHERE laboratory_profile_id = p_target_user_id OR user_profile_id = p_target_user_id;
    DELETE FROM laboratory_role_permissions WHERE laboratory_profile_id = p_target_user_id;
    DELETE FROM proformas WHERE user_id = p_target_user_id;
    DELETE FROM stl_files WHERE laboratory_id = p_target_user_id OR dentist_id = p_target_user_id;

    -- PHASE 3: Supprimer les données liées directement à auth.users
    DELETE FROM access_code_usage WHERE user_id = p_target_user_id;
    DELETE FROM access_codes WHERE created_by = p_target_user_id OR used_by = p_target_user_id;
    DELETE FROM admin_audit_log WHERE admin_id = p_target_user_id OR target_user_id = p_target_user_id;
    DELETE FROM alerts WHERE created_by = p_target_user_id;
    DELETE FROM archived_data WHERE user_id = p_target_user_id;
    DELETE FROM audit_log WHERE user_id = p_target_user_id OR laboratory_id = p_target_user_id;
    DELETE FROM batch_brands WHERE user_id = p_target_user_id;
    DELETE FROM batch_materials WHERE user_id = p_target_user_id;
    DELETE FROM batch_numbers WHERE user_id = p_target_user_id;
    DELETE FROM catalog_item_batch_link WHERE user_id = p_target_user_id;
    DELETE FROM catalog_items WHERE user_id = p_target_user_id;
    DELETE FROM delivery_note_batches WHERE user_id = p_target_user_id;
    DELETE FROM extension_payments WHERE user_id = p_target_user_id;
    DELETE FROM invoice_payments WHERE user_id = p_target_user_id;
    DELETE FROM patients WHERE user_id = p_target_user_id;
    DELETE FROM production_stages WHERE user_id = p_target_user_id;
    DELETE FROM resource_batch_link WHERE user_id = p_target_user_id;
    DELETE FROM resource_variants WHERE user_id = p_target_user_id;
    DELETE FROM resources WHERE user_id = p_target_user_id;
    DELETE FROM smtp_settings WHERE configured_by = p_target_user_id;
    DELETE FROM stock_movements WHERE created_by = p_target_user_id OR user_id = p_target_user_id;
    DELETE FROM support_messages WHERE sender_id = p_target_user_id;
    DELETE FROM support_tickets WHERE user_id = p_target_user_id;
    DELETE FROM user_extensions WHERE profile_id = p_target_user_id OR user_id = p_target_user_id;

    -- PHASE 4: Mettre à NULL les champs historiques
    UPDATE delivery_note_stages SET completed_by = NULL WHERE completed_by = p_target_user_id;
    UPDATE delivery_notes SET rejected_by = NULL WHERE rejected_by = p_target_user_id;
    UPDATE data_seals SET sealed_by = NULL WHERE sealed_by = p_target_user_id;
    UPDATE fiscal_periods SET closed_by = NULL WHERE closed_by = p_target_user_id;
    UPDATE work_assignments SET assigned_by = NULL WHERE assigned_by = p_target_user_id;
    UPDATE user_profiles SET impersonated_by = NULL WHERE impersonated_by = p_target_user_id;

    -- PHASE 5: Supprimer les comptes principaux
    DELETE FROM dentist_accounts WHERE id = p_target_user_id;
    DELETE FROM profiles WHERE id = p_target_user_id;
    DELETE FROM user_profiles WHERE id = p_target_user_id;
  END IF;

  -- Nettoyer les tables auth (pour tous les types d'utilisateurs)
  DELETE FROM auth.identities WHERE user_id = p_target_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_target_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = p_target_user_id;
  DELETE FROM auth.one_time_tokens WHERE user_id = p_target_user_id;

  -- Construire le résultat
  v_result := json_build_object(
    'success', true,
    'account_type', v_account_type,
    'account_name', v_profile_name,
    'user_id', p_target_user_id,
    'is_orphan', v_is_orphan
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user: %', SQLERRM;
END;
$$;

-- Fonction pour nettoyer tous les utilisateurs orphelins
CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orphan_count INT := 0;
  v_orphan RECORD;
BEGIN
  -- Trouver et supprimer tous les utilisateurs orphelins
  FOR v_orphan IN 
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN dentist_accounts da ON da.id = u.id
    WHERE up.id IS NULL AND p.id IS NULL AND da.id IS NULL
  LOOP
    -- Supprimer les données auth
    DELETE FROM auth.identities WHERE user_id = v_orphan.id;
    DELETE FROM auth.sessions WHERE user_id = v_orphan.id;
    DELETE FROM auth.mfa_factors WHERE user_id = v_orphan.id;
    DELETE FROM auth.one_time_tokens WHERE user_id = v_orphan.id;
    
    v_orphan_count := v_orphan_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'orphans_cleaned', v_orphan_count
  );
END;
$$;
