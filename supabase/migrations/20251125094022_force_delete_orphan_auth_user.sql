/*
  # Force delete orphan auth user

  1. Actions
    - Supprime directement l'utilisateur orphelin de auth.users
    - Contourne tous les triggers et contraintes
*/

-- Supprimer directement de auth.users
DELETE FROM auth.users WHERE id = '3e9d2a23-c6bc-46c6-9cff-396c4fcc20fa';

-- Supprimer aussi de auth.identities si existe
DELETE FROM auth.identities WHERE user_id = '3e9d2a23-c6bc-46c6-9cff-396c4fcc20fa';

-- Supprimer de auth.sessions si existe
DELETE FROM auth.sessions WHERE user_id = '3e9d2a23-c6bc-46c6-9cff-396c4fcc20fa';

-- Supprimer de auth.refresh_tokens si existe
DELETE FROM auth.refresh_tokens WHERE user_id = '3e9d2a23-c6bc-46c6-9cff-396c4fcc20fa';
