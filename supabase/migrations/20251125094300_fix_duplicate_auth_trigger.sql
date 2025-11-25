/*
  # Fix duplicate auth trigger

  1. Changes
    - Supprime le trigger en double handle_auth_user_created
    - Garde uniquement handle_auth_user_creation_trigger qui est le bon
*/

-- Supprimer le trigger en double que j'ai créé par erreur
DROP TRIGGER IF EXISTS handle_auth_user_created ON auth.users;

-- Supprimer aussi la fonction associée
DROP FUNCTION IF EXISTS handle_new_auth_user();
