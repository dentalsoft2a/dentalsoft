/*
  # Prévenir la duplication d'emails pour les comptes dentistes
  
  Cette migration ajoute :
  1. Une fonction pour vérifier si un email dentiste existe déjà
  2. Un trigger pour empêcher la création de doublons
  3. Une fonction pour nettoyer les comptes auth orphelins
*/

-- Fonction pour vérifier si un email dentiste existe déjà
CREATE OR REPLACE FUNCTION check_dentist_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier dans dentist_accounts
  IF EXISTS (SELECT 1 FROM dentist_accounts WHERE LOWER(email) = LOWER(p_email)) THEN
    RETURN true;
  END IF;
  
  -- Vérifier dans auth.users avec metadata is_dentist
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = LOWER(p_email)
    AND (raw_user_meta_data->>'is_dentist')::boolean = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les comptes auth orphelins (dentistes sans dentist_account)
CREATE OR REPLACE FUNCTION cleanup_orphaned_dentist_auth_accounts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_orphan_id UUID;
BEGIN
  -- Trouver les comptes auth marqués comme dentistes mais sans entrée dans dentist_accounts
  FOR v_orphan_id IN 
    SELECT id 
    FROM auth.users 
    WHERE (raw_user_meta_data->>'is_dentist')::boolean = true
    AND id NOT IN (SELECT id FROM dentist_accounts)
    AND created_at < NOW() - INTERVAL '10 minutes' -- Seulement les anciens pour éviter les problèmes de timing
  LOOP
    -- Supprimer le compte auth orphelin
    DELETE FROM auth.users WHERE id = v_orphan_id;
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour empêcher l'insertion de dentist_accounts avec email en double
CREATE OR REPLACE FUNCTION prevent_duplicate_dentist_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'email existe déjà (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM dentist_accounts 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Un compte dentiste avec cet email existe déjà'
      USING ERRCODE = 'unique_violation',
            HINT = 'Veuillez utiliser un email différent ou vous connecter avec votre compte existant';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS check_dentist_email_duplicate ON dentist_accounts;
CREATE TRIGGER check_dentist_email_duplicate
  BEFORE INSERT OR UPDATE OF email
  ON dentist_accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_dentist_email();

-- Fonction pour la page de registration (à appeler depuis le frontend)
CREATE OR REPLACE FUNCTION validate_dentist_registration(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  v_exists BOOLEAN;
  v_result JSON;
BEGIN
  v_exists := check_dentist_email_exists(p_email);
  
  IF v_exists THEN
    v_result := json_build_object(
      'valid', false,
      'error', 'email_exists',
      'message', 'Un compte avec cet email existe déjà. Veuillez vous connecter ou utiliser un autre email.'
    );
  ELSE
    v_result := json_build_object(
      'valid', true,
      'message', 'Email disponible'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Job de nettoyage quotidien des comptes orphelins (à intégrer dans la maintenance)
CREATE OR REPLACE FUNCTION run_daily_maintenance_with_dentist_cleanup()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_count INTEGER;
BEGIN
  -- Exécuter la maintenance existante
  v_result := run_daily_maintenance();
  
  -- Ajouter le nettoyage des comptes dentistes orphelins
  v_count := cleanup_orphaned_dentist_auth_accounts();
  v_result := v_result || format('Orphaned dentist auth accounts cleaned: %s\n', v_count);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour le job cron pour utiliser la nouvelle fonction
DO $$
BEGIN
  PERFORM cron.unschedule('daily-maintenance');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-maintenance',
  '0 2 * * *',
  'SELECT run_daily_maintenance_with_dentist_cleanup();'
);

-- Commentaires
COMMENT ON FUNCTION check_dentist_email_exists(TEXT) IS 'Vérifie si un email dentiste existe déjà dans le système';
COMMENT ON FUNCTION cleanup_orphaned_dentist_auth_accounts() IS 'Nettoie les comptes auth de dentistes sans entrée dans dentist_accounts';
COMMENT ON FUNCTION validate_dentist_registration(TEXT) IS 'Valide un email avant l''inscription d''un dentiste';
COMMENT ON FUNCTION prevent_duplicate_dentist_email() IS 'Trigger pour empêcher les emails en double (case-insensitive)';
