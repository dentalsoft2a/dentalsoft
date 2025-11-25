/*
  # Fix auth user deletion triggers

  1. Changes
    - Drop triggers qui bloquent la suppression d'utilisateurs auth orphelins
    - Recréer les triggers avec meilleure gestion des cas d'erreur
*/

-- Supprimer temporairement les triggers qui bloquent la suppression
DROP TRIGGER IF EXISTS handle_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer un trigger simple qui ne crée des profils que si l'utilisateur n'existe pas déjà
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ne rien faire si l'utilisateur existe déjà dans user_profiles
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Créer le profil uniquement si c'est une vraie création (pas une suppression)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'laboratory')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER handle_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();
