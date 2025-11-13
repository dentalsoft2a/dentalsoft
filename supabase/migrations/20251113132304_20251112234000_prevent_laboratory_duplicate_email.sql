/*
  # Prévenir la duplication d'emails pour les comptes laboratoire
  
  Cette migration ajoute :
  1. Contrainte UNIQUE sur l'email dans user_profiles
  2. Fonction pour vérifier si un email laboratoire existe déjà
  3. Trigger pour empêcher la création de doublons
  4. Fonction pour nettoyer les comptes auth orphelins
  5. Fonction de validation pour le frontend
*/

-- =============================================================================
-- 1. AJOUTER CONTRAINTE UNIQUE SUR EMAIL (SI ELLE N'EXISTE PAS)
-- =============================================================================

-- Vérifier et ajouter la contrainte unique sur email dans user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_email_key' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- =============================================================================
-- 2. FONCTION DE VÉRIFICATION D'EMAIL LABORATOIRE
-- =============================================================================

CREATE OR REPLACE FUNCTION check_laboratory_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier dans user_profiles (laboratoires)
  IF EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE LOWER(email) = LOWER(p_email)
    AND role = 'laboratory'
  ) THEN
    RETURN true;
  END IF;
  
  -- Vérifier dans auth.users pour laboratoires
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = LOWER(p_email)
    AND COALESCE((raw_user_meta_data->>'is_dentist')::boolean, false) = false
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. FONCTION DE VALIDATION POUR LE FRONTEND
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_laboratory_registration(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  v_exists BOOLEAN;
  v_result JSON;
BEGIN
  v_exists := check_laboratory_email_exists(p_email);
  
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

-- =============================================================================
-- 4. TRIGGER POUR EMPÊCHER LES DOUBLONS D'EMAIL
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_duplicate_laboratory_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier uniquement pour les laboratoires
  IF NEW.role = 'laboratory' THEN
    -- Vérifier si l'email existe déjà (case-insensitive)
    IF EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE LOWER(email) = LOWER(NEW.email)
      AND role = 'laboratory'
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Un compte laboratoire avec cet email existe déjà'
        USING ERRCODE = 'unique_violation',
              HINT = 'Veuillez utiliser un email différent ou vous connecter avec votre compte existant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS check_laboratory_email_duplicate ON user_profiles;
CREATE TRIGGER check_laboratory_email_duplicate
  BEFORE INSERT OR UPDATE OF email
  ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_laboratory_email();

-- =============================================================================
-- 5. FONCTION DE NETTOYAGE DES COMPTES ORPHELINS
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_laboratory_auth_accounts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_orphan_id UUID;
BEGIN
  -- Trouver les comptes auth (non-dentistes) sans entrée dans user_profiles
  FOR v_orphan_id IN 
    SELECT au.id 
    FROM auth.users au
    WHERE COALESCE((au.raw_user_meta_data->>'is_dentist')::boolean, false) = false
    AND au.id NOT IN (SELECT id FROM user_profiles)
    AND au.id NOT IN (SELECT id FROM profiles)
    AND au.created_at < NOW() - INTERVAL '10 minutes'
  LOOP
    -- Supprimer le compte auth orphelin
    DELETE FROM auth.users WHERE id = v_orphan_id;
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. FONCTION DE MAINTENANCE COMPLÈTE
-- =============================================================================

CREATE OR REPLACE FUNCTION run_daily_maintenance_complete()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_count INTEGER;
BEGIN
  -- Exécuter la maintenance de base
  v_result := run_daily_maintenance();
  
  -- Ajouter le nettoyage des comptes dentistes orphelins
  v_count := cleanup_orphaned_dentist_auth_accounts();
  v_result := v_result || format('Orphaned dentist auth accounts cleaned: %s\n', v_count);
  
  -- Ajouter le nettoyage des comptes laboratoires orphelins
  v_count := cleanup_orphaned_laboratory_auth_accounts();
  v_result := v_result || format('Orphaned laboratory auth accounts cleaned: %s\n', v_count);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. METTRE À JOUR LE JOB CRON
-- =============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('daily-maintenance');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-maintenance',
  '0 2 * * *',
  'SELECT run_daily_maintenance_complete();'
);

-- =============================================================================
-- 8. INDEX POUR OPTIMISER LES RECHERCHES D'EMAIL
-- =============================================================================

-- Index case-insensitive sur l'email pour user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower 
  ON user_profiles(LOWER(email));

-- Index pour les laboratoires uniquement
CREATE INDEX IF NOT EXISTS idx_user_profiles_laboratory_email 
  ON user_profiles(email) WHERE role = 'laboratory';

-- =============================================================================
-- 9. COMMENTAIRES
-- =============================================================================

COMMENT ON FUNCTION check_laboratory_email_exists(TEXT) IS 'Vérifie si un email laboratoire existe déjà dans le système';
COMMENT ON FUNCTION validate_laboratory_registration(TEXT) IS 'Valide un email avant l''inscription d''un laboratoire';
COMMENT ON FUNCTION prevent_duplicate_laboratory_email() IS 'Trigger pour empêcher les emails en double pour les laboratoires (case-insensitive)';
COMMENT ON FUNCTION cleanup_orphaned_laboratory_auth_accounts() IS 'Nettoie les comptes auth de laboratoires sans entrée dans user_profiles';
COMMENT ON FUNCTION run_daily_maintenance_complete() IS 'Maintenance quotidienne complète incluant dentistes et laboratoires';
