/*
  # Empêcher la création de user_profiles pour les dentistes
  
  Cette migration corrige le problème où les dentistes apparaissent
  dans la liste des laboratoires du panneau Super Admin.
  
  1. Changes
    - Modifier le trigger pour ne PAS créer de user_profile pour les dentistes
    - Les dentistes doivent uniquement avoir une entrée dans dentist_accounts
    - Nettoyer les user_profiles existants pour les dentistes
  
  2. Security
    - Maintient la séparation entre dentistes et laboratoires
*/

-- Mettre à jour la fonction pour vérifier si c'est un dentiste
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_is_dentist boolean;
BEGIN
  -- Get email and is_dentist flag from auth.users
  SELECT email, COALESCE((raw_user_meta_data->>'is_dentist')::boolean, false)
  INTO v_email, v_is_dentist
  FROM auth.users
  WHERE id = NEW.id;

  -- Ne créer un user_profile QUE si ce n'est PAS un dentiste
  IF NOT v_is_dentist THEN
    -- Create user_profile entry with trial and email
    INSERT INTO user_profiles (
      id,
      email,
      role,
      subscription_status,
      subscription_start_date,
      subscription_end_date,
      trial_used
    ) VALUES (
      NEW.id,
      COALESCE(v_email, ''),
      'user',
      'trial',
      now(),
      now() + interval '30 days',
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nettoyer les user_profiles pour les dentistes existants
DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM dentist_accounts
);

-- Ajouter un commentaire explicatif
COMMENT ON FUNCTION create_user_profile_on_signup() IS 
  'Crée un user_profile uniquement pour les laboratoires (pas pour les dentistes)';
