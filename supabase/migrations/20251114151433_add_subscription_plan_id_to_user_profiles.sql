/*
  # Ajouter subscription_plan_id à user_profiles
  
  Cette migration ajoute la référence au plan d'abonnement dans le profil utilisateur.
  
  ## Modifications
  
  1. Ajout de Colonnes
    - `subscription_plan_id` (uuid) - Référence au plan d'abonnement actif
    - Clé étrangère vers subscription_plans
  
  2. Mise à jour
    - Définir le plan standard par défaut pour les utilisateurs actifs
  
  3. Index
    - Index sur subscription_plan_id pour améliorer les performances
*/

-- Ajouter la colonne subscription_plan_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_plan_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN subscription_plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_plan 
  ON user_profiles(subscription_plan_id);

-- Mettre à jour les utilisateurs actifs pour pointer vers le plan standard
UPDATE user_profiles 
SET subscription_plan_id = (
  SELECT id FROM subscription_plans 
  WHERE plan_type = 'standard' AND is_active = true 
  LIMIT 1
)
WHERE subscription_status IN ('active', 'trial') 
  AND subscription_plan_id IS NULL;

-- Commentaires
COMMENT ON COLUMN user_profiles.subscription_plan_id IS 'ID du plan d''abonnement actif de l''utilisateur';
