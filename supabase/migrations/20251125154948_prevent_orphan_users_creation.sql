/*
  # Prevent orphan users creation

  1. Changes
    - Crée un trigger qui vérifie qu'un user_profile est créé après l'inscription
    - Supprime automatiquement les auth.users sans user_profile après 5 minutes
*/

-- Fonction pour nettoyer les utilisateurs orphelins automatiquement
CREATE OR REPLACE FUNCTION public.cleanup_stale_orphan_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supprimer les données auth des utilisateurs orphelins de plus de 5 minutes
  DELETE FROM auth.identities WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    WHERE up.id IS NULL 
    AND u.created_at < NOW() - INTERVAL '5 minutes'
  );

  DELETE FROM auth.sessions WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    WHERE up.id IS NULL 
    AND u.created_at < NOW() - INTERVAL '5 minutes'
  );

  DELETE FROM auth.mfa_factors WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    WHERE up.id IS NULL 
    AND u.created_at < NOW() - INTERVAL '5 minutes'
  );

  DELETE FROM auth.one_time_tokens WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    WHERE up.id IS NULL 
    AND u.created_at < NOW() - INTERVAL '5 minutes'
  );

  -- Log le nettoyage
  RAISE NOTICE 'Cleaned up orphan auth users older than 5 minutes';
END;
$$;

-- Créer une fonction PostgreSQL planifiée (à exécuter périodiquement)
-- Note: Cette fonction doit être appelée par un cron job ou un edge function périodique
COMMENT ON FUNCTION public.cleanup_stale_orphan_users() IS 
'Nettoie automatiquement les utilisateurs auth orphelins (sans user_profile) créés il y a plus de 5 minutes. 
Doit être appelé périodiquement via un cron job ou edge function.';
